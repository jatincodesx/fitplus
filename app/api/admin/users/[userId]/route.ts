import { revalidatePath } from "next/cache";
import { requireApiAdmin } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { getAuditRequestContext } from "@/lib/audit";
import { updateManagedUser } from "@/lib/admin";
import { adminUserUpdateSchema } from "@/lib/schemas/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const sessionUser = await requireApiAdmin();
    const payload = await parseJsonBody(req, adminUserUpdateSchema);
    const { userId } = await params;
    const requestContext = await getAuditRequestContext(req);

    const updatedUser = await updateManagedUser({
      actorUserId: sessionUser.id,
      actorRole: sessionUser.role,
      targetUserId: userId,
      nextRole: payload.role,
      nextStatus: payload.status,
      suspensionReason: payload.suspensionReason,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/admins");

    return apiOk({
      user: {
        id: updatedUser.id,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    return handleApiError(error, "Could not update that user.");
  }
}
