import { revalidatePath } from "next/cache";
import { requireApiAuth } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { deleteAccountRequestSchema } from "@/lib/schemas/account";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiAuth();
    await parseJsonBody(req, deleteAccountRequestSchema);

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        deletionRequestedAt: new Date(),
      },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "ACCOUNT_DELETION_REQUESTED",
      entityType: "User",
      entityId: sessionUser.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/profile");

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "Could not submit the account deletion request.");
  }
}
