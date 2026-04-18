import { apiOk, handleApiError, parseJsonBody, ApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { resetPasswordSchema } from "@/lib/schemas/auth";
import { consumeUserToken } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";
import { revokeUserSessions, updateUserPassword } from "@/lib/users";

export async function POST(req: Request) {
  try {
    const payload = await parseJsonBody(req, resetPasswordSchema);
    const tokenRecord = await consumeUserToken("PASSWORD_RESET", payload.token);

    if (!tokenRecord?.userId) {
      throw new ApiError(400, "This reset link is invalid or has expired.");
    }

    await updateUserPassword({
      userId: tokenRecord.userId,
      newPassword: payload.password,
      skipCurrentPasswordCheck: true,
    });

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: {
        emailVerified: tokenRecord.user?.emailVerified ?? new Date(),
      },
    });
    await revokeUserSessions(tokenRecord.userId);

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: tokenRecord.userId,
      targetUserId: tokenRecord.userId,
      eventType: "AUTH_PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: tokenRecord.userId,
      metadata: {
        sessionsRevoked: true,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "Could not reset your password.");
  }
}
