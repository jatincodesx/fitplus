import "server-only";

import type { UserRole } from "@/lib/auth-constants";
import { isSuperAdminRole } from "@/lib/auth-constants";
import { ApiError } from "@/lib/api";

export function canManageUser(actorRole: UserRole, targetRole: string) {
  if (actorRole === "SUPERADMIN") {
    return true;
  }

  return actorRole === "ADMIN" && targetRole === "USER";
}

export function canAssignRole(actorRole: UserRole, requestedRole: UserRole) {
  if (actorRole === "SUPERADMIN") {
    return true;
  }

  return actorRole === "ADMIN" && requestedRole === "USER";
}

export function assertCanManageUser(actorRole: UserRole, targetRole: string) {
  if (!canManageUser(actorRole, targetRole)) {
    throw new ApiError(403, "You are not allowed to manage this user.");
  }
}

export function assertCanAssignRole(actorRole: UserRole, requestedRole: UserRole) {
  if (!canAssignRole(actorRole, requestedRole)) {
    throw new ApiError(403, "You are not allowed to assign that role.");
  }
}

export function assertSuperAdmin(role: UserRole) {
  if (!isSuperAdminRole(role)) {
    throw new ApiError(403, "Superadmin access required.");
  }
}
