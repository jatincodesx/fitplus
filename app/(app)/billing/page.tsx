import { BillingClient } from "@/components/billing/billing-client";
import { getPlanCatalog } from "@/lib/billing/plans";
import { syncSubscriptionFromCheckoutSessionId } from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";
import { requireCustomerAppAccess } from "@/lib/auth";
import {
  getStripePublishableKey,
  isStripePublishableKeyConfigured,
  isStripeSecretConfigured,
} from "@/lib/stripe";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; canceled?: string }>;
}) {
  const sessionUser = await requireCustomerAppAccess();
  const query = await searchParams;

  let initialMessage: string | null = null;
  let initialError: string | null = null;
  const returnSessionId = query.session_id?.trim() || null;

  if (returnSessionId) {
    try {
      await syncSubscriptionFromCheckoutSessionId(returnSessionId, sessionUser.id);
      initialMessage = "Checkout completed. Subscription is syncing.";
    } catch {
      initialError = "We could not verify that checkout session. You can still refresh your subscription status below.";
    }
  } else if (query.canceled === "1") {
    initialMessage = "Checkout was canceled. You can choose another plan when ready.";
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      subscription: true,
      billingProfile: true,
    },
  });

  const plans = getPlanCatalog().map((plan) => ({
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    priceLabel: plan.priceLabel,
    cadence: plan.cadence,
    features: plan.features,
    checkoutEnabled: plan.checkoutEnabled,
    configured: !plan.checkoutEnabled || Boolean(plan.stripePriceId),
  }));
  const checkoutReady =
    isStripeSecretConfigured() &&
    isStripePublishableKeyConfigured() &&
    plans.some((plan) => plan.checkoutEnabled && plan.configured);

  return (
    <BillingClient
      currentPlan={{
        plan: user?.subscription?.plan ?? "Starter",
        planTier: user?.subscription?.planTier ?? "STARTER",
        status: user?.subscription?.status ?? "TRIALING",
        currentPeriodStart: user?.subscription?.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: user?.subscription?.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: user?.subscription?.cancelAtPeriodEnd ?? false,
      }}
      plans={plans}
      stripePublishableKey={getStripePublishableKey()}
      checkoutReady={checkoutReady}
      canOpenPortal={Boolean(user?.billingProfile?.customerId || user?.subscription?.externalCustomerId)}
      initialMessage={initialMessage}
      initialError={initialError}
      returnSessionId={returnSessionId}
    />
  );
}
