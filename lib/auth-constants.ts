import { z } from "zod";

export const USER_ROLES = ["USER", "ADMIN", "SUPERADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const userRoleSchema = z.enum(USER_ROLES);

export const USER_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "ARCHIVED", "DELETED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
export const userStatusSchema = z.enum(USER_STATUSES);

export const AUTH_TOKEN_TYPES = ["EMAIL_VERIFICATION", "PASSWORD_RESET", "INVITATION"] as const;
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];
export const authTokenTypeSchema = z.enum(AUTH_TOKEN_TYPES);

export const BILLING_PROVIDERS = ["NONE", "STRIPE", "APP_STORE", "PLAY_STORE", "MANUAL"] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];
export const billingProviderSchema = z.enum(BILLING_PROVIDERS);

export const BILLING_PLAN_TIERS = ["STARTER", "PRO", "ENTERPRISE"] as const;
export type BillingPlanTier = (typeof BILLING_PLAN_TIERS)[number];
export const billingPlanTierSchema = z.enum(BILLING_PLAN_TIERS);

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "INCOMPLETE",
  "PAUSED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);

export const ORGANIZATION_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
export const organizationRoleSchema = z.enum(ORGANIZATION_ROLES);

export const OAUTH_PROVIDERS = ["google", "apple"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS);

export const ADMIN_ROLES: readonly UserRole[] = ["ADMIN", "SUPERADMIN"] as const;

export const isAdminRole = (role: string | null | undefined): role is UserRole =>
  role === "ADMIN" || role === "SUPERADMIN";

export const isSuperAdminRole = (role: string | null | undefined): role is UserRole =>
  role === "SUPERADMIN";

export const isActiveUserStatus = (status: string | null | undefined): status is UserStatus =>
  status === "ACTIVE";
