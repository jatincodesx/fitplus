import "server-only";

import type Stripe from "stripe";
import type { BillingPlanTier, SubscriptionStatus } from "@/lib/auth-constants";
import { ApiError } from "@/lib/api";
import { getStripeServerClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getPlanByTier, getTierFromStripePriceId } from "@/lib/billing/plans";

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
      return "INCOMPLETE";
    case "paused":
      return "PAUSED";
    default:
      return "INCOMPLETE";
  }
}

function asDateFromUnix(timestamp: number | null): Date | null {
  if (!timestamp) {
    return null;
  }
  return new Date(timestamp * 1000);
}

async function resolveUserIdFromStripeCustomerId(customerId: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { billingProfile: { customerId } },
        { subscription: { externalCustomerId: customerId } },
      ],
    },
    select: { id: true },
  });

  return user?.id ?? null;
}

function resolveTierForSubscription(
  stripeSubscription: Stripe.Subscription,
  fallbackTier: BillingPlanTier | null
) {
  const priceId = stripeSubscription.items.data[0]?.price?.id ?? null;
  const mappedTier = getTierFromStripePriceId(priceId);
  if (mappedTier) {
    return {
      tier: mappedTier,
      priceId,
    };
  }

  return {
    tier: fallbackTier ?? "STARTER",
    priceId,
  };
}

export async function ensureStripeCustomerForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      billingProfile: true,
      subscription: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const existingCustomerId = user.billingProfile?.customerId ?? user.subscription?.externalCustomerId;
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const stripe = getStripeServerClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: {
      userId: user.id,
    },
  });

  await prisma.$transaction([
    prisma.billingProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        provider: "STRIPE",
        customerId: customer.id,
        billingEmail: user.email,
      },
      update: {
        provider: "STRIPE",
        customerId: customer.id,
        billingEmail: user.email,
      },
    }),
    prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: "Starter",
        planTier: "STARTER",
        status: "TRIALING",
        provider: "STRIPE",
        externalCustomerId: customer.id,
      },
      update: {
        provider: "STRIPE",
        externalCustomerId: customer.id,
      },
    }),
  ]);

  return customer.id;
}

export async function syncSubscriptionFromStripeSubscription(
  stripeSubscription: Stripe.Subscription,
  userId?: string | null
) {
  const customerId = typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : null;
  if (!customerId) {
    throw new ApiError(400, "Stripe subscription payload did not include a customer id.");
  }

  const userIdFromMetadata =
    typeof stripeSubscription.metadata?.userId === "string" ? stripeSubscription.metadata.userId : null;

  const resolvedUserId = userId ?? userIdFromMetadata ?? (await resolveUserIdFromStripeCustomerId(customerId));
  if (!resolvedUserId) {
    throw new ApiError(404, "Could not resolve an app user for that Stripe customer.");
  }

  const existing = await prisma.subscription.findUnique({
    where: { userId: resolvedUserId },
    select: {
      planTier: true,
    },
  });

  const fallbackTier = (existing?.planTier as BillingPlanTier | undefined) ?? null;
  const tierInfo = resolveTierForSubscription(stripeSubscription, fallbackTier);
  const planName = getPlanByTier(tierInfo.tier).name;
  const currentItem = stripeSubscription.items.data[0];

  const updatedSubscription = await prisma.subscription.upsert({
    where: { userId: resolvedUserId },
    create: {
      userId: resolvedUserId,
      plan: planName,
      planTier: tierInfo.tier,
      status: mapStripeSubscriptionStatus(stripeSubscription.status),
      provider: "STRIPE",
      externalCustomerId: customerId,
      externalSubscriptionId: stripeSubscription.id,
      priceId: tierInfo.priceId,
      currency: stripeSubscription.currency?.toUpperCase() ?? "USD",
      trialEndsAt: asDateFromUnix(stripeSubscription.trial_end),
      currentPeriodStart: asDateFromUnix(currentItem?.current_period_start ?? null),
      currentPeriodEnd: asDateFromUnix(currentItem?.current_period_end ?? null),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: asDateFromUnix(stripeSubscription.canceled_at),
    },
    update: {
      plan: planName,
      planTier: tierInfo.tier,
      status: mapStripeSubscriptionStatus(stripeSubscription.status),
      provider: "STRIPE",
      externalCustomerId: customerId,
      externalSubscriptionId: stripeSubscription.id,
      priceId: tierInfo.priceId,
      currency: stripeSubscription.currency?.toUpperCase() ?? "USD",
      trialEndsAt: asDateFromUnix(stripeSubscription.trial_end),
      currentPeriodStart: asDateFromUnix(currentItem?.current_period_start ?? null),
      currentPeriodEnd: asDateFromUnix(currentItem?.current_period_end ?? null),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: asDateFromUnix(stripeSubscription.canceled_at),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: resolvedUserId },
    select: { email: true },
  });

  await prisma.billingProfile.upsert({
    where: { userId: resolvedUserId },
    create: {
      userId: resolvedUserId,
      provider: "STRIPE",
      customerId,
      billingEmail: user?.email ?? null,
    },
    update: {
      provider: "STRIPE",
      customerId,
      billingEmail: user?.email ?? undefined,
    },
  });

  return updatedSubscription;
}

export async function syncSubscriptionFromCheckoutSessionId(
  checkoutSessionId: string,
  expectedUserId?: string
) {
  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });

  const sessionUserIdFromClientRef = typeof session.client_reference_id === "string" ? session.client_reference_id : null;
  const sessionUserIdFromMetadata =
    typeof session.metadata?.userId === "string" ? session.metadata.userId : null;
  const sessionUserId = sessionUserIdFromClientRef ?? sessionUserIdFromMetadata;

  if (expectedUserId && sessionUserId && sessionUserId !== expectedUserId) {
    throw new ApiError(403, "Checkout session does not belong to this user.");
  }

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const targetUserId = expectedUserId ?? sessionUserId ?? (customerId ? await resolveUserIdFromStripeCustomerId(customerId) : null);

  if (session.mode !== "subscription") {
    return session;
  }

  if (!targetUserId) {
    throw new ApiError(404, "Could not resolve a user for the checkout session.");
  }

  if (session.subscription && typeof session.subscription !== "string") {
    await syncSubscriptionFromStripeSubscription(session.subscription, targetUserId);
    return session;
  }

  if (typeof session.subscription === "string") {
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
    await syncSubscriptionFromStripeSubscription(stripeSubscription, targetUserId);
    return session;
  }

  if (customerId) {
    await prisma.subscription.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        plan: "Starter",
        planTier: "STARTER",
        status: "INCOMPLETE",
        provider: "STRIPE",
        externalCustomerId: customerId,
      },
      update: {
        provider: "STRIPE",
        externalCustomerId: customerId,
      },
    });
  }

  return session;
}

export async function syncLatestSubscriptionFromStripeCustomer(
  customerId: string,
  userId?: string | null
) {
  const stripe = getStripeServerClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  if (subscriptions.data.length === 0) {
    return null;
  }

  const preferred =
    subscriptions.data.find((item) => item.status === "active" || item.status === "trialing") ??
    subscriptions.data.find((item) => item.status === "past_due") ??
    subscriptions.data[0];

  return syncSubscriptionFromStripeSubscription(preferred, userId ?? undefined);
}
