import { revalidatePath } from "next/cache";
import { requireApiAuth } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { changePasswordSchema } from "@/lib/schemas/account";
import { updateUserPassword, revokeUserSessions } from "@/lib/users";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiAuth();
    const payload = await parseJsonBody(req, changePasswordSchema);

    await updateUserPassword({
      userId: sessionUser.id,
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });

    await revokeUserSessions(sessionUser.id, sessionUser.sessionId);

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "ACCOUNT_PASSWORD_UPDATED",
      entityType: "User",
      entityId: sessionUser.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/profile");

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "Could not update your password.");
  }
}
