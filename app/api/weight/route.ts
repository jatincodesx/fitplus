import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { weightLogSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, weightLogSchema);

    const log = await prisma.weightLog.create({
      data: { userId: sessionUser.id, date: payload.date, weightKg: payload.weightKg },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "USER_WEIGHT_LOG_CREATED",
      entityType: "WeightLog",
      entityId: log.id,
      metadata: {
        date: payload.date.toISOString(),
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({ log });
  } catch (error) {
    return handleApiError(error, "Could not record your weight.");
  }
}
