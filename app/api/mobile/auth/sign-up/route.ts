import type { MobileSessionPayload } from "@fitplus/contracts";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { createAppSession } from "@/lib/auth";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { sendEmailVerificationEmail } from "@/lib/auth-notifications";
import { isSelfSignupEnabled } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/schemas/auth";
import { createPasswordUser, normalizeEmail } from "@/lib/users";

export async function POST(req: Request) {
  try {
    if (!(await isSelfSignupEnabled())) {
      throw new ApiError(403, "Self-serve sign up is currently disabled. Contact support to request access.");
    }

    const payload = await parseJsonBody(req, signUpSchema);
    const email = normalizeEmail(payload.email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
      },
    });

    if (existingUser) {
      throw new ApiError(
        409,
        existingUser.password
          ? "An account with that email already exists."
          : "An account already exists for that email. Use your linked provider or reset your password."
      );
    }

    const user = await createPasswordUser({
      email,
      password: payload.password,
      name: payload.name,
    });

    const [verification, session] = await Promise.all([
      sendEmailVerificationEmail({
        userId: user.id,
        email,
      }),
      createAppSession(user.id),
    ]);

    const requestContext = await getAuditRequestContext(req);
    await Promise.all([
      createAuditLog({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "AUTH_SIGN_UP",
        entityType: "User",
        entityId: user.id,
        metadata: {
          channel: "mobile",
          emailVerified: false,
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      }),
      createAuditLog({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "AUTH_EMAIL_VERIFICATION_REQUESTED",
        entityType: "UserToken",
        entityId: user.id,
        metadata: {
          reason: "SIGN_UP",
          emailDeliveryStatus: verification.delivery.status,
          emailProvider: verification.delivery.provider,
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      }),
    ]);

    return apiOk<MobileSessionPayload>({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: session.user.role,
        status: session.user.status,
        emailVerified: session.user.emailVerified,
        onboardingCompletedAt: session.user.onboardingCompletedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error, "Could not create a mobile account.");
  }
}
