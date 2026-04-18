import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { sendEmailVerificationEmail } from "@/lib/auth-notifications";
import { getAuthSession } from "@/lib/auth";
import { resendVerificationSchema } from "@/lib/schemas/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/users";

const genericMessage =
  "If the account is eligible, a verification email will be sent.";

const notConfiguredMessage =
  "Email delivery is not configured yet, so we could not send a verification email.";

const failedMessage =
  "We could not send a verification email right now. Please try again shortly.";

export async function POST(req: Request) {
  try {
    const payload = await parseJsonBody(req, resendVerificationSchema);
    const email = normalizeEmail(payload.email);
    const session = await getAuthSession();
    const sessionEmail =
      typeof session?.user?.email === "string" ? normalizeEmail(session.user.email) : null;
    const canDiscloseDelivery = sessionEmail === email;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        status: true,
      },
    });

    if (!user || user.emailVerified || user.status === "DELETED") {
      return apiOk({
        ok: true,
        verificationEmailSent: false,
        emailDeliveryStatus: "SKIPPED",
        message: genericMessage,
        debugVerificationUrl: null,
      });
    }

    const verification = await sendEmailVerificationEmail({
      userId: user.id,
      email,
    });
    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "AUTH_EMAIL_VERIFICATION_REQUESTED",
      entityType: "UserToken",
      entityId: user.id,
      metadata: {
        reason: "RESEND",
        emailDeliveryStatus: verification.delivery.status,
        emailProvider: verification.delivery.provider,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    const message = verification.delivery.delivered
      ? "Verification email sent."
      : verification.delivery.status === "NOT_CONFIGURED"
        ? notConfiguredMessage
        : failedMessage;
    const publicMessage = verification.delivery.status === "NOT_CONFIGURED"
      ? notConfiguredMessage
      : genericMessage;

    return apiOk({
      ok: true,
      verificationEmailSent: canDiscloseDelivery ? verification.delivery.delivered : false,
      emailDeliveryStatus: canDiscloseDelivery ? verification.delivery.status : "REQUEST_ACCEPTED",
      message: canDiscloseDelivery ? message : publicMessage,
      debugVerificationUrl:
        canDiscloseDelivery && process.env.NODE_ENV !== "production" ? verification.url : null,
    });
  } catch (error) {
    return handleApiError(error, "Could not resend the verification email.");
  }
}
