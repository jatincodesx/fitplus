import { revalidatePath } from "next/cache";
import { requireApiAdmin } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assertCanManageUser } from "@/lib/permissions";
import { revokeUserSessions } from "@/lib/users";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const sessionUser = await requireApiAdmin();
    const { userId } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetUser) {
      throw new Error("User not found.");
    }

    assertCanManageUser(sessionUser.role, targetUser.role);

    const revokedCount = await revokeUserSessions(userId);
    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: userId,
      eventType: "ADMIN_USER_SESSIONS_REVOKED",
      entityType: "User",
      entityId: userId,
      metadata: { revokedCount },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/admins");

    return apiOk({ revokedCount });
  } catch (error) {
    return handleApiError(error, "Could not revoke that user's sessions.");
  }
}
