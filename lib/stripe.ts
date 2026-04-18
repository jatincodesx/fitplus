import "server-only";

import Stripe from "stripe";
import { ApiError } from "@/lib/api";

const STRIPE_API_VERSION = "2026-03-25.dahlia";

let stripeSingleton: Stripe | null = null;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ApiError(500, `Missing required environment variable: ${name}`);
  }
  return value;
}

export function getStripeServerClient() {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: STRIPE_API_VERSION,
      appInfo: {
        name: "FitPlus",
      },
    });
  }

  return stripeSingleton;
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;
}

export function getStripeWebhookSecret() {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

export function isStripeSecretConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripePublishableKeyConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

export function isStripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}
