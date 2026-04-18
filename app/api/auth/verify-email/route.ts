import { apiOk, handleApiError, parseJsonBody, ApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { z } from "zod";
import { consumeUserToken } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";

const verifyEmailSchema = z.object({
  token: z.string().min(32, "Verification token is invalid."),
});

export async function POST(req: Request) {
  try {
    const payload = await parseJsonBody(req, verifyEmailSchema);
    const tokenRecord = await consumeUserToken("EMAIL_VERIFICATION", payload.token);

    if (!tokenRecord?.userId) {
      throw new ApiError(400, "This verification link is invalid or has expired.");
    }

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: {
        emailVerified: new Date(),
      },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: tokenRecord.userId,
      targetUserId: tokenRecord.userId,
      eventType: "AUTH_EMAIL_VERIFIED",
      entityType: "User",
      entityId: tokenRecord.userId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "Could not verify your email.");
  }
}
