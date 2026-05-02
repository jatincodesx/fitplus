import { BillingClient } from "@/components/billing/billing-client";
import { getPlanCatalog } from "@/lib/billing/plans";
import { getBillingPageData } from "@/lib/billing-page-data";
import { syncSubscriptionFromCheckoutSessionId } from "@/lib/billing/subscriptions";
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
  let pageLoadFailed = false;

  let initialMessage: string | null = null;
  let initialError: string | null = null;
  const returnSessionId = query.session_id?.trim() || null;

  if (returnSessionId) {
    try {
      await syncSubscriptionFromCheckoutSessionId(returnSessionId, sessionUser.id);
      initialMessage = "Checkout completed. Subscription is syncing.";
    } catch (error) {
      pageLoadFailed = true;
      console.error("[billing-page-error]", {
        label: "checkout-session-sync",
        error: error instanceof Error ? error.message : "UnknownError",
      });
      initialError = "We could not verify that checkout session. You can still refresh your subscription status below.";
    }
  } else if (query.canceled === "1") {
    initialMessage = "Checkout was canceled. You can choose another plan when ready.";
  }

  let user: Awaited<ReturnType<typeof getBillingPageData>> = null;

  try {
    user = await getBillingPageData(sessionUser.id);
  } catch (error) {
    pageLoadFailed = true;
    console.error("[billing-page-error]", {
      label: "billing-user-query",
      error: error instanceof Error ? error.message : "UnknownError",
    });
  }

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
        plan: user?.subscription?.plan ?? (pageLoadFailed ? "Unavailable" : "Starter"),
        planTier: user?.subscription?.planTier ?? (pageLoadFailed ? "UNAVAILABLE" : "STARTER"),
        status: user?.subscription?.status ?? (pageLoadFailed ? "UNAVAILABLE" : "TRIALING"),
        currentPeriodStart: user?.subscription?.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: user?.subscription?.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: user?.subscription?.cancelAtPeriodEnd ?? false,
      }}
      plans={plans}
      stripePublishableKey={getStripePublishableKey()}
      checkoutReady={checkoutReady}
      canOpenPortal={Boolean(user?.billingProfile?.customerId || user?.subscription?.externalCustomerId)}
      initialMessage={initialMessage}
      initialError={
        initialError ??
        (pageLoadFailed
          ? "Some billing data could not load. Refresh this page before retrying checkout or the billing portal."
          : null)
      }
      returnSessionId={returnSessionId}
    />
  );
}
