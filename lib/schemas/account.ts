import { z } from "zod";
import { oauthProviderSchema } from "@/lib/auth-constants";
import { passwordSchema } from "@/lib/schemas/auth";

export const accountProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Name is too long."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const disconnectProviderSchema = z.object({
  provider: oauthProviderSchema,
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().cuid(),
});

export const deleteAccountRequestSchema = z.object({
  confirm: z.literal(true),
});
