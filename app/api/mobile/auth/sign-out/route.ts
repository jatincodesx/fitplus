import { apiOk, ApiError, handleApiError } from "@/lib/api";
import { getApiSessionUser } from "@/lib/auth";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const sessionUser = await getApiSessionUser(req);

    if (!sessionUser) {
      throw new ApiError(401, "Unauthorized.");
    }

    await prisma.session.deleteMany({
      where: {
        sessionToken: sessionUser.sessionId,
      },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "AUTH_SIGN_OUT",
      entityType: "Session",
      entityId: sessionUser.sessionId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "Could not sign out from mobile.");
  }
}
