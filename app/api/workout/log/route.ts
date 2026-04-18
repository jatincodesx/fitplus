import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { workoutLogSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, workoutLogSchema);

    const [exercise, workoutDay] = await Promise.all([
      payload.exerciseId
        ? prisma.exercise.findFirst({
            where: {
              id: payload.exerciseId,
              workoutDay: {
                workoutPlan: {
                  userId: sessionUser.id,
                },
              },
            },
            select: {
              id: true,
              workoutDayId: true,
            },
          })
        : Promise.resolve(null),
      payload.workoutDayId
        ? prisma.workoutDay.findFirst({
            where: {
              id: payload.workoutDayId,
              workoutPlan: {
                userId: sessionUser.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (payload.exerciseId && !exercise) {
      throw new ApiError(404, "Exercise not found.");
    }

    if (payload.workoutDayId && !workoutDay) {
      throw new ApiError(404, "Workout day not found.");
    }

    if (exercise && payload.workoutDayId && exercise.workoutDayId !== payload.workoutDayId) {
      throw new ApiError(400, "Exercise does not belong to that workout day.");
    }

    const log = await prisma.workoutLog.create({
      data: {
        userId: sessionUser.id,
        exerciseId: payload.exerciseId ?? null,
        workoutDayId: payload.workoutDayId ?? exercise?.workoutDayId ?? null,
        completed: true,
        notes: payload.notes ?? null,
      },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "WORKOUT_LOG_CREATED",
      entityType: "WorkoutLog",
      entityId: log.id,
      metadata: {
        exerciseId: payload.exerciseId ?? null,
        workoutDayId: payload.workoutDayId ?? exercise?.workoutDayId ?? null,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ log });
  } catch (error) {
    return handleApiError(error, "Could not save that workout log.");
  }
}
