import { apiOk, handleApiError, parseJsonBody, ApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { acceptInviteSchema } from "@/lib/schemas/auth";
import { consumeUserToken } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";
import { updateUserPassword } from "@/lib/users";

export async function POST(req: Request) {
  try {
    const payload = await parseJsonBody(req, acceptInviteSchema);
    const tokenRecord = await consumeUserToken("INVITATION", payload.token);

    if (!tokenRecord?.userId) {
      throw new ApiError(400, "This invitation is invalid or has expired.");
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user || user.status === "DELETED") {
      throw new ApiError(404, "Invitation target not found.");
    }

    await updateUserPassword({
      userId: user.id,
      newPassword: payload.password,
      skipCurrentPasswordCheck: true,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: payload.name.trim(),
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "AUTH_INVITATION_ACCEPTED",
      entityType: "User",
      entityId: user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ ok: true, email: tokenRecord.email });
  } catch (error) {
    return handleApiError(error, "Could not accept the invitation.");
  }
}
