import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { apiOk, handleApiError, parseJsonBody, ApiError } from "@/lib/api";
import { sendEmailVerificationEmail } from "@/lib/auth-notifications";
import { isSelfSignupEnabled } from "@/lib/platform-settings";
import { signUpSchema } from "@/lib/schemas/auth";
import { createPasswordUser, normalizeEmail } from "@/lib/users";
import { prisma } from "@/lib/prisma";

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
        status: true,
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

    const verification = await sendEmailVerificationEmail({
      userId: user.id,
      email,
    });

    const requestContext = await getAuditRequestContext(req);
    await Promise.all([
      createAuditLog({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "AUTH_SIGN_UP",
        entityType: "User",
        entityId: user.id,
        metadata: {
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

    return apiOk({
      id: user.id,
      email: user.email,
      verificationEmailSent: verification.delivery.delivered,
      verificationEmailStatus: verification.delivery.status,
      debugVerificationUrl: process.env.NODE_ENV !== "production" ? verification.url : null,
    });
  } catch (error) {
    return handleApiError(error, "Could not create account.");
  }
}
