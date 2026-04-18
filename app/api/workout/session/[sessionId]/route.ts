import type { NextRequest } from "next/server";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { updateWorkoutSessionExercise } from "@/lib/workout-progress";
import { workoutSessionExerciseUpdateSchema } from "@/lib/validators";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const { sessionId } = await params;
    const workoutSession = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId: sessionUser.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    if (!workoutSession) {
      throw new ApiError(404, "Workout session not found.");
    }

    return apiOk({ workoutSession });
  } catch (error) {
    return handleApiError(error, "Could not load that workout session.");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const { sessionId } = await params;
    const payload = await parseJsonBody(req, workoutSessionExerciseUpdateSchema);

    const workoutSession = await updateWorkoutSessionExercise(
      sessionUser.id,
      sessionId,
      payload.sessionExerciseId,
      payload.completedSets
    );

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "WORKOUT_SESSION_UPDATED",
      entityType: "WorkoutSession",
      entityId: sessionId,
      metadata: {
        sessionExerciseId: payload.sessionExerciseId,
        completedSets: payload.completedSets,
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
      "Could not update workout session."
    );
  }
}
