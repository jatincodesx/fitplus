import { revalidatePath } from "next/cache";
import { requireApiSuperAdmin } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { getAuditRequestContext } from "@/lib/audit";
import { upsertPlatformSetting } from "@/lib/admin";
import { platformSettingSchema } from "@/lib/schemas/admin";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiSuperAdmin();
    const payload = await parseJsonBody(req, platformSettingSchema);
    const requestContext = await getAuditRequestContext(req);

    const setting = await upsertPlatformSetting({
      actorUserId: sessionUser.id,
      actorRole: sessionUser.role,
      key: payload.key,
      value: payload.value,
      description: payload.description,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/superadmin");
    revalidatePath("/superadmin/settings");

    return apiOk({ setting });
  } catch (error) {
    return handleApiError(error, "Could not update platform settings.");
  }
}
