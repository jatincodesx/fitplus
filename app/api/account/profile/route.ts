import { revalidatePath } from "next/cache";
import { requireApiAuth } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { accountProfileSchema } from "@/lib/schemas/account";
import { updateUserName } from "@/lib/users";

export async function PATCH(req: Request) {
  try {
    const sessionUser = await requireApiAuth();
    const payload = await parseJsonBody(req, accountProfileSchema);
    const user = await updateUserName(sessionUser.id, payload.name);
    const requestContext = await getAuditRequestContext(req);

    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "ACCOUNT_PROFILE_UPDATED",
      entityType: "User",
      entityId: sessionUser.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/profile");

    return apiOk({ user: { id: user.id, name: user.name } });
  } catch (error) {
    return handleApiError(error, "Could not update your profile.");
  }
}
