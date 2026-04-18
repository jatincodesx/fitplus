import { revalidatePath } from "next/cache";
import { requireApiAuth } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { oauthProviderSchema } from "@/lib/auth-constants";
import { disconnectOAuthProvider } from "@/lib/users";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const sessionUser = await requireApiAuth();
    const { provider } = await params;
    const parsedProvider = oauthProviderSchema.safeParse(provider);

    if (!parsedProvider.success) {
      return handleApiError(new Error("Invalid provider."), "Invalid provider.");
    }

    await disconnectOAuthProvider(sessionUser.id, parsedProvider.data);

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "ACCOUNT_PROVIDER_DISCONNECTED",
      entityType: "Account",
      entityId: parsedProvider.data,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/profile");

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "Could not disconnect that provider.");
  }
}
