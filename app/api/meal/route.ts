import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { mealLogSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, mealLogSchema);

    const log = await prisma.mealLog.create({
      data: {
        userId: sessionUser.id,
        date: payload.date,
        mealType: payload.mealType,
        calories: payload.calories,
        protein: payload.protein ?? 0,
        carbs: payload.carbs ?? 0,
        fat: payload.fat ?? 0,
        notes: payload.notes ?? null,
      },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "USER_MEAL_LOG_CREATED",
      entityType: "MealLog",
      entityId: log.id,
      metadata: {
        mealType: payload.mealType,
        date: payload.date.toISOString(),
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ log });
  } catch (error) {
    return handleApiError(error, "Could not save that meal log.");
  }
}
