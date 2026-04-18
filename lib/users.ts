import "server-only";

import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { OAuthProvider, UserRole, UserStatus } from "@/lib/auth-constants";
import { ApiError } from "@/lib/api";

export const DEFAULT_PROFILE_GOAL = "Build a stronger, leaner body";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function ensureUserScaffold(userId: string, email: string) {
  await prisma.$transaction([
    prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        currentGoal: DEFAULT_PROFILE_GOAL,
      },
      update: {},
    }),
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: "Starter",
        planTier: "STARTER",
        status: "ACTIVE",
        provider: "NONE",
      },
      update: {},
    }),
    prisma.billingProfile.upsert({
      where: { userId },
      create: {
        userId,
        provider: "NONE",
        billingEmail: email,
      },
      update: {
        billingEmail: email,
      },
    }),
  ]);
}

type CreatePasswordUserInput = {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  status?: UserStatus;
  createdById?: string | null;
  invitedById?: string | null;
  emailVerifiedAt?: Date | null;
};

export async function createPasswordUser(input: CreatePasswordUserInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const hashedPassword = await hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: input.name.trim(),
      role: input.role ?? "USER",
      status: input.status ?? "ACTIVE",
      createdById: input.createdById ?? null,
      invitedById: input.invitedById ?? null,
      invitedAt: input.invitedById ? new Date() : null,
      emailVerified: input.emailVerifiedAt ?? null,
    },
  });

  await ensureUserScaffold(user.id, normalizedEmail);

  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      profile: true,
      subscription: true,
      billingProfile: true,
    },
  });
}

type CreateInvitedUserInput = {
  email: string;
  name: string;
  role: UserRole;
  actorUserId: string;
};

export async function createInvitedUser(input: CreateInvitedUserInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: input.name.trim(),
      role: input.role,
      status: "INVITED",
      createdById: input.actorUserId,
      invitedById: input.actorUserId,
      invitedAt: new Date(),
    },
  });

  await ensureUserScaffold(user.id, normalizedEmail);

  return user;
}

export async function updateUserPassword(input: {
  userId: string;
  currentPassword?: string;
  newPassword: string;
  skipCurrentPasswordCheck?: boolean;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.password && !input.skipCurrentPasswordCheck) {
    if (!input.currentPassword) {
      throw new ApiError(400, "Current password is required.");
    }

    const matches = await compare(input.currentPassword, user.password);
    if (!matches) {
      throw new ApiError(400, "Current password is incorrect.");
    }
  }

  const password = await hash(input.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password,
      passwordChangedAt: new Date(),
    },
  });
}

export async function updateUserName(userId: string, name: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: name.trim(),
    },
  });
}

export async function getUserAuthMethods(userId: string) {
  const [user, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { provider: "asc" },
      select: {
        id: true,
        provider: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    hasPassword: Boolean(user?.password),
    accounts: accounts.map((account) => ({
      id: account.id,
      provider: account.provider as OAuthProvider | string,
      createdAt: account.createdAt,
    })),
  };
}

export async function disconnectOAuthProvider(userId: string, provider: OAuthProvider) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      password: true,
      accounts: {
        select: {
          id: true,
          provider: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const account = user.accounts.find((entry) => entry.provider === provider);
  if (!account) {
    throw new ApiError(404, "Provider link not found.");
  }

  const linkedMethodCount = user.accounts.length + (user.password ? 1 : 0);
  if (linkedMethodCount <= 1) {
    throw new ApiError(400, "You must keep at least one sign-in method on the account.");
  }

  await prisma.account.delete({
    where: { id: account.id },
  });
}

export async function revokeUserSessions(userId: string, excludeSessionToken?: string | null) {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      ...(excludeSessionToken
        ? {
            sessionToken: {
              not: excludeSessionToken,
            },
          }
        : {}),
    },
  });

  return result.count;
}

export async function revokeSingleSession(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!session) {
    throw new ApiError(404, "Session not found.");
  }

  await prisma.session.delete({
    where: { id: session.id },
  });
}
