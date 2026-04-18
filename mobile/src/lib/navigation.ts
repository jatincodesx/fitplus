import type { MobileSessionUser } from "@fitplus/contracts";

export function getPostAuthPath(user: MobileSessionUser) {
  if (user.role === "ADMIN") {
    return "/ops";
  }

  if (!user.onboardingCompletedAt) {
    return "/onboarding";
  }

  return "/(tabs)";
}
