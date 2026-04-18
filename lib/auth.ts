import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession, type NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import type { UserRole, UserStatus } from "@/lib/auth-constants";
import { ADMIN_ROLES } from "@/lib/auth-constants";
import { getDefaultAppPath } from "@/lib/role-routing";
import { signInSchema } from "@/lib/schemas/auth";
import { ensureUserScaffold, normalizeEmail } from "@/lib/users";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 4;
const AUTH_COOKIE_NAME_SECURE = "__Secure-next-auth.session-token";
const AUTH_COOKIE_NAME_INSECURE = "next-auth.session-token";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  status: UserStatus;
  sessionId: string;
  emailVerified: boolean;
  onboardingCompletedAt?: Date | null;
};

type AppJwt = JWT & {
  role?: UserRole;
  status?: UserStatus;
  sid?: string;
  ev?: string | null;
};

const authErrorMessages: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "You do not have access to that resource.",
  OAuthAccountNotLinked: "Use your existing sign-in method first, then connect the provider from your account settings.",
  AccountDisabled: "This account is not active. Contact support if you need help.",
  MissingEmail: "This sign-in provider did not return an email address.",
  Callback: "The authentication callback failed. Please try again.",
  Default: "Could not complete sign-in. Please try again.",
};

const getProviderConfig = () => ({
  google:
    Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET),
  apple:
    Boolean(process.env.APPLE_CLIENT_ID) && Boolean(process.env.APPLE_CLIENT_SECRET),
});

const providerConfig = getProviderConfig();

const baseAdapter = PrismaAdapter(prisma);

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(data: Parameters<Adapter["createUser"]>[0]) {
    if (!data.email) {
      throw new Error("MissingEmail");
    }

    const email = normalizeEmail(data.email);
    const user = await prisma.user.create({
      data: {
        email,
        name: data.name?.trim() || null,
        image: data.image ?? null,
        emailVerified: data.emailVerified ?? new Date(),
        role: "USER",
        status: "ACTIVE",
      },
    });

    await ensureUserScaffold(user.id, user.email);

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      image: user.image,
    };
  },
};

function getConfiguredNextAuthUrl() {
  const value = process.env.NEXTAUTH_URL?.trim();
  return value ? value : null;
}

function shouldUseSecureAuthCookies() {
  const configuredUrl = getConfiguredNextAuthUrl();
  if (configuredUrl) {
    return configuredUrl.startsWith("https://");
  }

  return process.env.NODE_ENV === "production";
}

function logAuthDebug(event: string, metadata?: Record<string, unknown>) {
  if (process.env.AUTH_DEBUG !== "true") {
    return;
  }

  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[auth-debug] ${event}${payload}`);
}

function isOAuthEmailVerified(provider?: string | null, profile?: Record<string, unknown> | null) {
  if (!provider || provider === "credentials") {
    return true;
  }

  const rawValue = profile?.email_verified;
  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    return rawValue.toLowerCase() === "true";
  }

  return provider === "apple";
}

async function getDbUserForToken(token: AppJwt) {
  if (!token.sub || !token.sid) {
    throw new Error("SessionMissing");
  }

  const sessionRecord = await prisma.session.findUnique({
    where: { sessionToken: token.sid },
    include: {
      user: true,
    },
  });

  if (!sessionRecord) {
    throw new Error("SessionMissing");
  }

  if (sessionRecord.expires <= new Date()) {
    await prisma.session.delete({
      where: { id: sessionRecord.id },
    });
    throw new Error("SessionExpired");
  }

  if (sessionRecord.user.status !== "ACTIVE") {
    throw new Error("AccountDisabled");
  }

  const shouldRefresh =
    sessionRecord.updatedAt.getTime() + SESSION_UPDATE_AGE_SECONDS * 1000 <= Date.now();

  if (shouldRefresh) {
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionRecord.id },
        data: {
          lastActiveAt: new Date(),
          expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
        },
      }),
      prisma.user.update({
        where: { id: sessionRecord.user.id },
        data: {
          lastSeenAt: new Date(),
        },
      }),
    ]);
  }

  return sessionRecord.user;
}

async function createJwtSession(userId: string) {
  const requestContext = await getAuditRequestContext();
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  try {
    await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires,
        ipAddress: requestContext.ipAddress ?? null,
        userAgent: requestContext.userAgent ?? null,
        lastActiveAt: new Date(),
      },
    });
    logAuthDebug("session-create-success", { userId });
  } catch (error) {
    logAuthDebug("session-create-failure", {
      userId,
      error: error instanceof Error ? error.message : "UnknownError",
    });
    throw error;
  }

  return {
    sessionToken,
    expires,
  };
}

async function getRequestHeaders(request?: Request) {
  if (request) {
    return new Headers(request.headers);
  }

  try {
    const requestHeaders = await headers();
    return new Headers(requestHeaders);
  } catch {
    return new Headers();
  }
}

function getBearerToken(requestHeaders: Headers) {
  const authorization = requestHeaders.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function getSessionUserFromSessionToken(sessionToken: string): Promise<SessionUser | null> {
  const sessionRecord = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!sessionRecord) {
    return null;
  }

  if (sessionRecord.expires <= new Date()) {
    await prisma.session.delete({
      where: { id: sessionRecord.id },
    });
    return null;
  }

  if (sessionRecord.user.status !== "ACTIVE") {
    return {
      id: sessionRecord.user.id,
      email: sessionRecord.user.email,
      name: sessionRecord.user.name,
      image: sessionRecord.user.image,
      role: sessionRecord.user.role as UserRole,
      status: sessionRecord.user.status as UserStatus,
      sessionId: sessionRecord.sessionToken,
      emailVerified: Boolean(sessionRecord.user.emailVerified),
      onboardingCompletedAt: sessionRecord.user.onboardingCompletedAt,
    };
  }

  const shouldRefresh =
    sessionRecord.updatedAt.getTime() + SESSION_UPDATE_AGE_SECONDS * 1000 <= Date.now();

  if (shouldRefresh) {
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionRecord.id },
        data: {
          lastActiveAt: new Date(),
          expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
        },
      }),
      prisma.user.update({
        where: { id: sessionRecord.user.id },
        data: {
          lastSeenAt: new Date(),
        },
      }),
    ]);
  }

  return {
    id: sessionRecord.user.id,
    email: sessionRecord.user.email,
    name: sessionRecord.user.name,
    image: sessionRecord.user.image,
    role: sessionRecord.user.role as UserRole,
    status: sessionRecord.user.status as UserStatus,
    sessionId: sessionRecord.sessionToken,
    emailVerified: Boolean(sessionRecord.user.emailVerified),
    onboardingCompletedAt: sessionRecord.user.onboardingCompletedAt,
  };
}

export async function authenticatePasswordUser(
  credentials: unknown,
  request?: Request
): Promise<SessionUser | null> {
  const parsed = signInSchema.safeParse(credentials);
  const requestContext = await getAuditRequestContext(
    request
      ? {
          headers: new Headers(request.headers as HeadersInit),
        }
      : undefined
  );

  if (!parsed.success) {
    await createAuditLog({
      eventType: "AUTH_SIGN_IN_FAILED",
      entityType: "User",
      metadata: {
        reason: "INVALID_CREDENTIAL_PAYLOAD",
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    return null;
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    await createAuditLog({
      eventType: "AUTH_SIGN_IN_FAILED",
      entityType: "User",
      metadata: { reason: "EMAIL_NOT_FOUND", email },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    return null;
  }

  if (user.status !== "ACTIVE") {
    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "AUTH_SIGN_IN_FAILED",
      entityType: "User",
      entityId: user.id,
      metadata: { reason: "ACCOUNT_NOT_ACTIVE", status: user.status },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    throw new Error("AccountDisabled");
  }

  if (!user.password) {
    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "AUTH_SIGN_IN_FAILED",
      entityType: "User",
      entityId: user.id,
      metadata: { reason: "PASSWORD_NOT_SET" },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    throw new Error("OAuthAccountNotLinked");
  }

  const isValid = await compare(parsed.data.password, user.password);
  if (!isValid) {
    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "AUTH_SIGN_IN_FAILED",
      entityType: "User",
      entityId: user.id,
      metadata: { reason: "PASSWORD_MISMATCH" },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    sessionId: "",
    emailVerified: Boolean(user.emailVerified),
    onboardingCompletedAt: user.onboardingCompletedAt,
  };
}

export async function createAppSession(userId: string) {
  const sessionRecord = await createJwtSession(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

  return {
    token: sessionRecord.sessionToken,
    expiresAt: sessionRecord.expires,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      sessionId: sessionRecord.sessionToken,
      emailVerified: Boolean(user.emailVerified),
      onboardingCompletedAt: user.onboardingCompletedAt,
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  useSecureCookies: shouldUseSecureAuthCookies(),
  cookies: {
    sessionToken: {
      name: shouldUseSecureAuthCookies() ? AUTH_COOKIE_NAME_SECURE : AUTH_COOKIE_NAME_INSECURE,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: shouldUseSecureAuthCookies(),
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  providers: [
    CredentialsProvider({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const user = await authenticatePasswordUser(credentials, request as Request | undefined);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
    ...(providerConfig.google
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
    ...(providerConfig.apple
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
    newUser: "/onboarding",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email ? normalizeEmail(user.email) : null;
      if (!email) {
        return "/sign-in?error=MissingEmail";
      }

      if (account?.provider !== "credentials" && !isOAuthEmailVerified(account?.provider, profile as Record<string, unknown> | null)) {
        return "/sign-in?error=AccessDenied";
      }

      const dbUser = await prisma.user.findUnique({
        where: { email },
      });

      if (dbUser) {
        if (dbUser.status !== "ACTIVE") {
          return "/sign-in?error=AccountDisabled";
        }

        await ensureUserScaffold(dbUser.id, dbUser.email);

        if (account?.provider !== "credentials" && !dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              emailVerified: new Date(),
              image: dbUser.image ?? user.image ?? null,
              name: dbUser.name ?? user.name ?? null,
            },
          });
        }
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      const appToken = token as AppJwt;

      if (trigger === "signIn" && user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (!dbUser || dbUser.status !== "ACTIVE") {
          throw new Error("AccountDisabled");
        }

        const sessionRecord = await createJwtSession(dbUser.id);

        appToken.sub = dbUser.id;
        appToken.email = dbUser.email;
        appToken.name = dbUser.name ?? undefined;
        appToken.picture = dbUser.image ?? undefined;
        appToken.role = dbUser.role as UserRole;
        appToken.status = dbUser.status as UserStatus;
        appToken.sid = sessionRecord.sessionToken;
        appToken.ev = dbUser.emailVerified?.toISOString() ?? null;

        return appToken;
      }

      if (!appToken.sub || !appToken.sid) {
        return appToken;
      }

      const dbUser = await getDbUserForToken(appToken);
      appToken.email = dbUser.email;
      appToken.name = dbUser.name ?? undefined;
      appToken.picture = dbUser.image ?? undefined;
      appToken.role = dbUser.role as UserRole;
      appToken.status = dbUser.status as UserStatus;
      appToken.ev = dbUser.emailVerified?.toISOString() ?? null;

      return appToken;
    },
    async session({ session, token }) {
      const appToken = token as AppJwt;

      if (!session.user || !appToken.sub || !appToken.email || !appToken.sid) {
        return session;
      }

      session.user.id = appToken.sub;
      session.user.email = appToken.email;
      session.user.role = (appToken.role ?? "USER") as UserRole;
      session.user.status = (appToken.status ?? "ACTIVE") as UserStatus;
      session.user.sessionId = appToken.sid;
      session.user.emailVerified = Boolean(appToken.ev);

      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      const requestContext = await getAuditRequestContext();
      const userId = user.id;

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            lastLoginAt: new Date(),
            lastSeenAt: new Date(),
          },
        });
      }

      await createAuditLog({
        actorUserId: userId,
        targetUserId: userId,
        eventType: "AUTH_SIGN_IN_SUCCEEDED",
        entityType: "User",
        entityId: userId,
        metadata: {
          provider: account?.provider ?? "credentials",
          isNewUser: Boolean(isNewUser),
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });
    },
    async signOut({ token }) {
      const appToken = token as AppJwt | undefined;

      if (appToken?.sid) {
        await prisma.session.deleteMany({
          where: { sessionToken: appToken.sid },
        });
      }

      await createAuditLog({
        actorUserId: appToken?.sub,
        targetUserId: appToken?.sub,
        eventType: "AUTH_SIGN_OUT",
        entityType: "Session",
        entityId: appToken?.sid ?? null,
      });
    },
    async createUser({ user }) {
      if (user.id && user.email) {
        await ensureUserScaffold(user.id, normalizeEmail(user.email));
      }

      await createAuditLog({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "AUTH_USER_CREATED",
        entityType: "User",
        entityId: user.id,
      });
    },
    async linkAccount({ user, account }) {
      await createAuditLog({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "AUTH_ACCOUNT_LINKED",
        entityType: "Account",
        entityId: `${account.provider}:${account.providerAccountId}`,
        metadata: {
          provider: account.provider,
        },
      });
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.email || !session.user.role || !session.user.status || !session.user.sessionId) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    role: session.user.role,
    status: session.user.status,
    sessionId: session.user.sessionId,
    emailVerified: session.user.emailVerified ?? false,
    onboardingCompletedAt: null,
  };
});

export async function requireAuth() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/sign-in");
  }

  if (sessionUser.status !== "ACTIVE") {
    redirect("/sign-in?error=AccountDisabled");
  }

  return sessionUser;
}

export async function requireRole(...roles: UserRole[]) {
  const sessionUser = await requireAuth();
  if (!roles.includes(sessionUser.role)) {
    redirect(getDefaultAppPath(sessionUser.role));
  }
  return sessionUser;
}

export const requireAdmin = () => requireRole(...ADMIN_ROLES);

export const requireSuperAdmin = () => requireRole("SUPERADMIN");

export const requireCustomerAppAccess = () => requireRole("USER", "SUPERADMIN");

export async function requireApiAuth() {
  const requestHeaders = await getRequestHeaders();
  const bearerToken = getBearerToken(requestHeaders);
  const sessionUser = bearerToken
    ? await getSessionUserFromSessionToken(bearerToken)
    : await getSessionUser();
  if (!sessionUser) {
    throw new ApiError(401, "Unauthorized.");
  }

  if (sessionUser.status !== "ACTIVE") {
    throw new ApiError(403, "This account is not active.");
  }

  return sessionUser;
}

export async function getApiSessionUser(request?: Request) {
  const requestHeaders = await getRequestHeaders(request);
  const bearerToken = getBearerToken(requestHeaders);

  if (bearerToken) {
    return getSessionUserFromSessionToken(bearerToken);
  }

  return getSessionUser();
}

export async function requireApiRole(...roles: UserRole[]) {
  const sessionUser = await requireApiAuth();
  if (!roles.includes(sessionUser.role)) {
    throw new ApiError(403, "Forbidden.");
  }
  return sessionUser;
}

export const requireApiAdmin = () => requireApiRole(...ADMIN_ROLES);

export const requireApiSuperAdmin = () => requireApiRole("SUPERADMIN");

export const requireApiCustomerAppAccess = () => requireApiRole("USER", "SUPERADMIN");

export async function ensureUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  return prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { profile: true, subscription: true, accounts: true, billingProfile: true },
  });
}

export function getAuthErrorMessage(error?: string | null) {
  if (!error) {
    return null;
  }

  return authErrorMessages[error] ?? authErrorMessages.Default;
}

export function getAvailableAuthProviders() {
  return {
    credentials: true,
    google: providerConfig.google,
    apple: providerConfig.apple,
  };
}
