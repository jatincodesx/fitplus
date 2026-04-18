import type { UserRole } from "@/lib/auth-constants";

export const customerRoutePrefixes = [
  "/dashboard",
  "/profile",
  "/onboarding",
  "/workouts",
  "/nutrition",
  "/progress",
  "/coach",
  "/coach-call",
  "/billing",
] as const;

export const adminRoutePrefixes = ["/admin"] as const;
export const superAdminRoutePrefixes = ["/superadmin"] as const;

export type AppArea = "customer" | "admin" | "superadmin" | "auth" | "public";

export const matchesRoutePrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function getAppAreaFromPath(pathname: string): AppArea {
  if (customerRoutePrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
    return "customer";
  }

  if (adminRoutePrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
    return "admin";
  }

  if (superAdminRoutePrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
    return "superadmin";
  }

  if (
    ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email", "/auth/complete"].some(
      (prefix) => matchesRoutePrefix(pathname, prefix)
    )
  ) {
    return "auth";
  }

  return "public";
}

export function getDefaultAppPath(role: UserRole) {
  switch (role) {
    case "SUPERADMIN":
      return "/superadmin";
    case "ADMIN":
      return "/admin";
    default:
      return "/dashboard";
  }
}

export function canAccessCustomerArea(role: UserRole) {
  return role === "USER" || role === "SUPERADMIN";
}

export function canAccessAdminArea(role: UserRole) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function canAccessSuperAdminArea(role: UserRole) {
  return role === "SUPERADMIN";
}

export function canAccessArea(role: UserRole, area: AppArea) {
  switch (area) {
    case "customer":
      return canAccessCustomerArea(role);
    case "admin":
      return canAccessAdminArea(role);
    case "superadmin":
      return canAccessSuperAdminArea(role);
    default:
      return true;
  }
}
