import type { MobileSessionPayload } from "@fitplus/contracts";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { authenticatePasswordUser, createAppSession } from "@/lib/auth";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { signInSchema } from "@/lib/schemas/auth";

export async function POST(req: Request) {
  try {
    const payload = await parseJsonBody(req, signInSchema);
    const user = await authenticatePasswordUser(payload, req);

    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }

    const session = await createAppSession(user.id);
    const requestContext = await getAuditRequestContext(req);

    await createAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "AUTH_SIGN_IN_SUCCEEDED",
      entityType: "Session",
      entityId: session.token,
      metadata: {
        provider: "mobile-credentials",
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk<MobileSessionPayload>({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: session.user.role,
        status: session.user.status,
        emailVerified: session.user.emailVerified,
        onboardingCompletedAt: session.user.onboardingCompletedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error, "Could not sign in on mobile.");
  }
}
