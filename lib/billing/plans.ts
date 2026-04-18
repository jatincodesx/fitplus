import "server-only";

import type { BillingPlanTier } from "@/lib/auth-constants";
import { ApiError } from "@/lib/api";

export type PlanCatalogItem = {
  tier: BillingPlanTier;
  name: string;
  description: string;
  priceLabel: string;
  cadence: "month";
  features: string[];
  stripePriceId: string | null;
  checkoutEnabled: boolean;
};

const PLAN_CATALOG: Record<BillingPlanTier, Omit<PlanCatalogItem, "tier">> = {
  STARTER: {
    name: "Starter",
    description: "Core training stack and onboarding baseline.",
    priceLabel: "$0",
    cadence: "month",
    features: [
      "Workout + nutrition planning",
      "Coach chat history",
      "Core dashboard visibility",
    ],
    stripePriceId: null,
    checkoutEnabled: false,
  },
  PRO: {
    name: "Pro",
    description: "Priority coaching workflows with deeper weekly progression.",
    priceLabel: "$20",
    cadence: "month",
    features: [
      "Everything in Starter",
      "Priority coach generation",
      "Advanced progress intelligence",
    ],
    stripePriceId: process.env.STRIPE_PRICE_PRO?.trim() || null,
    checkoutEnabled: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "High-touch support and platform-grade controls.",
    priceLabel: "$50",
    cadence: "month",
    features: [
      "Everything in Pro",
      "Premium support lane",
      "Advanced organization controls",
    ],
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE?.trim() || null,
    checkoutEnabled: true,
  },
};

export const CHECKOUT_ENABLED_PLAN_TIERS: BillingPlanTier[] = ["PRO", "ENTERPRISE"];

export function getPlanByTier(tier: BillingPlanTier): PlanCatalogItem {
  const plan = PLAN_CATALOG[tier];
  return {
    tier,
    ...plan,
  };
}

export function getPlanCatalog(): PlanCatalogItem[] {
  return (Object.keys(PLAN_CATALOG) as BillingPlanTier[]).map((tier) => getPlanByTier(tier));
}

export function getCheckoutPlanCatalog() {
  return CHECKOUT_ENABLED_PLAN_TIERS.map((tier) => getPlanByTier(tier));
}

export function getStripePriceIdForTier(tier: BillingPlanTier) {
  if (!CHECKOUT_ENABLED_PLAN_TIERS.includes(tier)) {
    throw new ApiError(400, "That plan does not require checkout.");
  }

  const plan = getPlanByTier(tier);
  if (!plan.stripePriceId) {
    throw new ApiError(500, `Missing Stripe price configuration for ${tier}.`);
  }

  return plan.stripePriceId;
}

export function getTierFromStripePriceId(priceId: string | null | undefined): BillingPlanTier | null {
  if (!priceId) {
    return null;
  }

  const match = getCheckoutPlanCatalog().find((plan) => plan.stripePriceId === priceId);
  return match?.tier ?? null;
}
