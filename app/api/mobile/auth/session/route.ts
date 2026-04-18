import type { MobileSessionPayload } from "@fitplus/contracts";
import { apiOk, handleApiError } from "@/lib/api";
import { getApiSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const sessionUser = await getApiSessionUser(req);

    if (!sessionUser) {
      return apiOk<MobileSessionPayload | null>(null);
    }

    return apiOk<MobileSessionPayload>({
      token: sessionUser.sessionId,
      expiresAt: "",
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        image: sessionUser.image,
        role: sessionUser.role,
        status: sessionUser.status,
        emailVerified: sessionUser.emailVerified,
        onboardingCompletedAt: sessionUser.onboardingCompletedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error, "Could not load the mobile session.");
  }
}
