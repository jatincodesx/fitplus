import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/auth-notifications";
import { getEmailDeliveryHealth } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { normalizeEmail } from "@/lib/users";
import { prisma } from "@/lib/prisma";

const genericSuccessMessage =
  "If an account exists for that email, a reset link has been sent.";

const notConfiguredMessage =
  "Password reset email delivery is not configured yet. Please contact support.";

const failedMessage =
  "If an account exists for that email, we could not send a reset link right now. Please try again shortly.";

export async function POST(req: Request) {
  try {
    const payload = await parseJsonBody(req, forgotPasswordSchema);
    const email = normalizeEmail(payload.email);
    const emailHealth = getEmailDeliveryHealth();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        status: true,
      },
    });

    if (user && user.status === "ACTIVE") {
      const reset = await sendPasswordResetEmail({
        userId: user.id,
        email,
      });

      const requestContext = await getAuditRequestContext(req);
      await createAuditLog({
        actorUserId: user.id,
        targetUserId: user.id,
        eventType: "AUTH_PASSWORD_RESET_REQUESTED",
        entityType: "User",
        entityId: user.id,
        metadata: {
          hadPassword: Boolean(user.password),
          emailDeliveryStatus: reset.delivery.status,
          emailProvider: reset.delivery.provider,
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      const message = reset.delivery.delivered
        ? genericSuccessMessage
        : reset.delivery.status === "NOT_CONFIGURED"
          ? notConfiguredMessage
          : failedMessage;

      return apiOk({
        ok: true,
        message,
        emailDeliveryStatus: reset.delivery.status,
        debugResetUrl: process.env.NODE_ENV !== "production" ? reset.url : null,
      });
    }

    return apiOk({
      ok: true,
      message: emailHealth.configured ? genericSuccessMessage : notConfiguredMessage,
      emailDeliveryStatus: emailHealth.configured ? "SKIPPED" : "NOT_CONFIGURED",
      debugResetUrl: null,
    });
  } catch (error) {
    return handleApiError(error, "Could not process the password reset request.");
  }
}
