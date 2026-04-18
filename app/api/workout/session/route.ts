import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { createOrResumeWorkoutSession } from "@/lib/workout-progress";
import { workoutSessionCreateSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, workoutSessionCreateSchema);
    const workoutSession = await createOrResumeWorkoutSession(sessionUser.id, payload.workoutDayId, {
      forceNew: payload.forceNew,
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "WORKOUT_SESSION_STARTED",
      entityType: "WorkoutSession",
      entityId: workoutSession.id,
      metadata: {
        workoutDayId: payload.workoutDayId,
        forceNew: payload.forceNew,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ workoutSession });
  } catch (error) {
    return handleApiError(
      error instanceof Error && !(error instanceof ApiError)
        ? new ApiError(400, error.message)
        : error,
      "Could not start workout session."
    );
  }
}
