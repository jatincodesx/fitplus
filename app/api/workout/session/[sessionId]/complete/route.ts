import type { NextRequest } from "next/server";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { completeWorkoutSession } from "@/lib/workout-progress";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const { sessionId } = await params;
    const workoutSession = await completeWorkoutSession(sessionUser.id, sessionId);

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "WORKOUT_SESSION_COMPLETED",
      entityType: "WorkoutSession",
      entityId: sessionId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ workoutSession });
  } catch (error) {
    return handleApiError(
      error instanceof Error && !(error instanceof ApiError)
        ? new ApiError(400, error.message)
        : error,
      "Could not complete workout session."
    );
  }
}
