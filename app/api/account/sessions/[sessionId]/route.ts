import { revalidatePath } from "next/cache";
import { requireApiAuth } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { revokeSingleSession } from "@/lib/users";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionUser = await requireApiAuth();
    const { sessionId } = await params;

    await revokeSingleSession(sessionUser.id, sessionId);

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "ACCOUNT_SESSION_REVOKED",
      entityType: "Session",
      entityId: sessionId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/profile");

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "Could not revoke that session.");
  }
}
