import { revalidatePath } from "next/cache";
import { requireApiAdmin } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { getAuditRequestContext } from "@/lib/audit";
import { inviteUserSchema } from "@/lib/schemas/admin";
import { inviteManagedUser } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiAdmin();
    const payload = await parseJsonBody(req, inviteUserSchema);
    const requestContext = await getAuditRequestContext(req);

    const result = await inviteManagedUser({
      actorUserId: sessionUser.id,
      actorRole: sessionUser.role,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/admins");

    const message = result.emailDelivery.delivered
      ? "Invitation email sent."
      : result.emailDelivery.status === "NOT_CONFIGURED"
        ? "User invited, but email delivery is not configured yet."
        : "User invited, but we could not send the invitation email right now.";

    return apiOk({
      invitedUserId: result.invitedUser.id,
      invitationEmailSent: result.emailDelivery.delivered,
      emailDeliveryStatus: result.emailDelivery.status,
      message,
      debugInviteUrl: process.env.NODE_ENV !== "production" ? result.inviteUrl : null,
    });
  } catch (error) {
    return handleApiError(error, "Could not invite that user.");
  }
}
