import { z } from "zod";
import {
  billingPlanTierSchema,
  subscriptionStatusSchema,
  userRoleSchema,
  userStatusSchema,
} from "@/lib/auth-constants";
import { emailSchema } from "@/lib/schemas/auth";

export const adminUserFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const adminUserUpdateSchema = z
  .object({
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    suspensionReason: z.string().trim().max(200).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined || value.suspensionReason !== undefined, {
    message: "At least one user field must be updated.",
  });

export const inviteUserSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, "Name is required.").max(80, "Name is too long."),
  role: userRoleSchema.default("USER"),
});

export const platformSettingSchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.union([z.string(), z.boolean(), z.number()]),
  description: z.string().trim().max(160).optional(),
});

export const subscriptionAdminUpdateSchema = z.object({
  plan: z.string().trim().min(1).max(80),
  planTier: billingPlanTierSchema,
  status: subscriptionStatusSchema,
});

export const adminUserAuthActionSchema = z.object({
  action: z.enum(["SEND_INVITATION", "SEND_PASSWORD_RESET", "SEND_EMAIL_VERIFICATION"]),
});
