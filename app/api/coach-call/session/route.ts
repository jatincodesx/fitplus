import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();

    const call = await prisma.coachCallSession.create({
      data: {
        userId: sessionUser.id,
        status: "CONNECTING",
      },
    });

    const requestContext = await getAuditRequestContext();
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "COACH_CALL_SESSION_STARTED",
      entityType: "CoachCallSession",
      entityId: call.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ sessionId: call.id });
  } catch (error) {
    return handleApiError(error, "Could not start the coach session.");
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionParam = searchParams.get("sessionId");
    const latest = searchParams.get("latest");

    const sessionUser = await requireApiCustomerAppAccess();

    if (latest === "1") {
      const call = await prisma.coachCallSession.findFirst({
        where: { userId: sessionUser.id },
        orderBy: { createdAt: "desc" },
        include: { transcripts: { orderBy: { timestamp: "asc" } }, intake: true, planLog: true },
      });

      if (!call) {
        return apiOk({ sessionId: null, transcripts: [] });
      }

      return apiOk(call);
    }

    if (!sessionParam) {
      throw new ApiError(400, "sessionId required");
    }

    const call = await prisma.coachCallSession.findFirst({
      where: { id: sessionParam, userId: sessionUser.id },
      include: { transcripts: { orderBy: { timestamp: "asc" } }, intake: true, planLog: true },
    });

    if (!call) {
      throw new ApiError(404, "Session not found.");
    }

    return apiOk(call);
  } catch (error) {
    return handleApiError(error, "Could not load that coach session.");
  }
}
