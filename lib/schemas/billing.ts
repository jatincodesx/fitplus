import { z } from "zod";
import { billingPlanTierSchema } from "@/lib/auth-constants";

export const createCheckoutSessionSchema = z.object({
  planTier: billingPlanTierSchema.refine((tier) => tier === "PRO" || tier === "ENTERPRISE", {
    message: "That plan is not available for checkout.",
  }),
});

export const createPortalSessionSchema = z
  .object({
    returnPath: z.string().trim().optional(),
  })
  .default({});
