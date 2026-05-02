import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import {
  createCoachCallSession,
  getCoachCallSession,
  getLatestCoachCallSession,
} from "@/lib/coach-call-session-data";

export async function POST() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();

    const call = await createCoachCallSession(sessionUser.id);

    void getAuditRequestContext()
      .then((requestContext) =>
        createAuditLog({
          actorUserId: sessionUser.id,
          targetUserId: sessionUser.id,
          eventType: "COACH_CALL_SESSION_STARTED",
          entityType: "CoachCallSession",
          entityId: call.id,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
        })
      )
      .catch((error) => {
        console.error("[coach-call-session-error]", {
          label: "audit-log",
          error: error instanceof Error ? error.message : "UnknownError",
        });
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
      const call = await getLatestCoachCallSession(sessionUser.id);

      if (!call) {
        return apiOk({ sessionId: null, transcripts: [] });
      }

      return apiOk(call);
    }

    if (!sessionParam) {
      throw new ApiError(400, "sessionId required");
    }

    const call = await getCoachCallSession(sessionUser.id, sessionParam);

    if (!call) {
      throw new ApiError(404, "Session not found.");
    }

    return apiOk(call);
  } catch (error) {
    return handleApiError(error, "Could not load that coach session.");
  }
}
