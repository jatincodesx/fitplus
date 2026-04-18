import { revalidatePath } from "next/cache";
import { requireApiAdmin } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { getAuditRequestContext } from "@/lib/audit";
import { sendManagedUserAuthAction } from "@/lib/admin";
import { adminUserAuthActionSchema } from "@/lib/schemas/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const sessionUser = await requireApiAdmin();
    const payload = await parseJsonBody(req, adminUserAuthActionSchema);
    const { userId } = await params;
    const requestContext = await getAuditRequestContext(req);

    const result = await sendManagedUserAuthAction({
      actorUserId: sessionUser.id,
      actorRole: sessionUser.role,
      targetUserId: userId,
      action: payload.action,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/admins");

    const successMessages: Record<typeof payload.action, string> = {
      SEND_INVITATION: "Invitation email sent.",
      SEND_PASSWORD_RESET: "Password reset email sent.",
      SEND_EMAIL_VERIFICATION: "Verification email sent.",
    };

    const fallbackMessage = result.emailDelivery.status === "NOT_CONFIGURED"
      ? "Email delivery is not configured yet."
      : "We could not send the email right now.";

    return apiOk({
      userId: result.userId,
      emailSent: result.emailDelivery.delivered,
      emailDeliveryStatus: result.emailDelivery.status,
      message: result.emailDelivery.delivered ? successMessages[payload.action] : fallbackMessage,
      debugUrl: process.env.NODE_ENV !== "production" ? result.debugUrl : null,
    });
  } catch (error) {
    return handleApiError(error, "Could not complete that auth action.");
  }
}
