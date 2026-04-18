"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { BillingPlanTier } from "@/lib/auth-constants";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BillingPlanView = {
  tier: BillingPlanTier;
  name: string;
  description: string;
  priceLabel: string;
  cadence: "month";
  features: string[];
  checkoutEnabled: boolean;
  configured: boolean;
};

type BillingClientProps = {
  currentPlan: {
    plan: string;
    planTier: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  plans: BillingPlanView[];
  stripePublishableKey: string | null;
  checkoutReady: boolean;
  canOpenPortal: boolean;
  initialMessage: string | null;
  initialError: string | null;
  returnSessionId: string | null;
};

type ApiErrorPayload = {
  error?: string;
};

type CheckoutSessionPayload = {
  sessionId: string;
  clientSecret: string;
};

export function BillingClient(props: BillingClientProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<BillingPlanTier>(
    props.currentPlan.planTier === "PRO" || props.currentPlan.planTier === "ENTERPRISE"
      ? (props.currentPlan.planTier as BillingPlanTier)
      : "PRO"
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(props.initialError);
  const [message, setMessage] = useState<string | null>(props.initialMessage);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(props.returnSessionId);
  const [showEmbeddedCheckout, setShowEmbeddedCheckout] = useState(Boolean(props.returnSessionId));

  const stripePromise = useMemo(() => {
    if (!props.stripePublishableKey) {
      return null;
    }
    return loadStripe(props.stripePublishableKey);
  }, [props.stripePublishableKey]);

  async function requestCheckoutSession(planTier: BillingPlanTier) {
    const response = await fetch("/api/billing/checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planTier }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as ApiErrorPayload;
      throw new Error(data.error ?? "Could not create checkout session.");
    }

    return (await response.json()) as CheckoutSessionPayload;
  }

  async function syncSubscription(sessionId?: string | null) {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/billing/subscription/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionId ? { sessionId } : {}),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        throw new Error(data.error ?? "Could not sync subscription.");
      }

      setMessage("Subscription updated.");
      setError(null);
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  async function onStartCheckout() {
    setError(null);
    setMessage(null);

    if (!props.checkoutReady || !stripePromise) {
      setError("Stripe is not fully configured yet. Add the missing billing environment values first.");
      return;
    }

    setIsCreatingSession(true);
    try {
      const payload = await requestCheckoutSession(selectedTier);
      setCheckoutClientSecret(payload.clientSecret);
      setCheckoutSessionId(payload.sessionId);
      setShowEmbeddedCheckout(true);
    } catch (caughtError) {
      const messageText = caughtError instanceof Error ? caughtError.message : "Could not start checkout.";
      setError(messageText);
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function onCheckoutComplete() {
    try {
      await syncSubscription(checkoutSessionId);
      setShowEmbeddedCheckout(false);
      setCheckoutClientSecret(null);
      setMessage("Payment complete. Your plan is now active.");
    } catch (caughtError) {
      const messageText =
        caughtError instanceof Error ? caughtError.message : "Checkout completed, but we could not refresh billing state.";
      setError(messageText);
    }
  }

  async function onOpenPortal() {
    setError(null);
    setIsOpeningPortal(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ returnPath: "/billing" }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        throw new Error(data.error ?? "Could not open billing portal.");
      }

      const payload = (await response.json()) as { url: string };
      window.location.assign(payload.url);
    } catch (caughtError) {
      const messageText = caughtError instanceof Error ? caughtError.message : "Could not open billing portal.";
      setError(messageText);
    } finally {
      setIsOpeningPortal(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Billing</p>
        <h1 className="text-3xl font-semibold">Plans & subscriptions</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Manage your subscription with embedded Stripe checkout and durable webhook sync.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader title="Current plan" description="Live status from your account subscription record" />
        <div className="grid gap-3 rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-sm text-[var(--color-muted)] md:grid-cols-2">
          <p>
            <span className="font-semibold text-foreground">Plan:</span> {props.currentPlan.plan}
          </p>
          <p>
            <span className="font-semibold text-foreground">Tier:</span> {props.currentPlan.planTier}
          </p>
          <p>
            <span className="font-semibold text-foreground">Status:</span> {props.currentPlan.status}
          </p>
          <p>
            <span className="font-semibold text-foreground">Current period:</span>{" "}
            {props.currentPlan.currentPeriodStart ? new Date(props.currentPlan.currentPeriodStart).toLocaleDateString() : "—"} to{" "}
            {props.currentPlan.currentPeriodEnd ? new Date(props.currentPlan.currentPeriodEnd).toLocaleDateString() : "—"}
          </p>
          <p>
            <span className="font-semibold text-foreground">Cancel at period end:</span>{" "}
            {props.currentPlan.cancelAtPeriodEnd ? "Yes" : "No"}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Choose your plan" description="Checkout is created server-side with validated Stripe price IDs." />
        <div className="grid gap-4 lg:grid-cols-3">
          {props.plans.map((plan) => {
            const isCurrent = props.currentPlan.planTier === plan.tier;
            const isSelected = selectedTier === plan.tier;
            return (
              <button
                key={plan.tier}
                type="button"
                className={`rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)]/70 bg-black/20 hover:bg-white/5"
                }`}
                onClick={() => {
                  if (plan.checkoutEnabled && plan.configured) {
                    setSelectedTier(plan.tier);
                  }
                }}
                disabled={!plan.checkoutEnabled || !plan.configured}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{plan.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">{plan.description}</p>
                  </div>
                  {isCurrent ? <Badge variant="success">Current</Badge> : null}
                </div>
                <p className="mt-4 text-3xl font-semibold">
                  {plan.priceLabel}
                  <span className="text-sm font-normal text-[var(--color-muted)]">/{plan.cadence}</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {!plan.checkoutEnabled ? (
                  <p className="mt-4 text-xs text-[var(--color-muted)]">No checkout required for this plan.</p>
                ) : null}
                {plan.checkoutEnabled && !plan.configured ? (
                  <p className="mt-4 text-xs text-amber-300">Stripe price id is not configured for this tier.</p>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onStartCheckout} disabled={isCreatingSession || !props.checkoutReady}>
            {isCreatingSession ? "Starting checkout..." : "Continue to checkout"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => syncSubscription(checkoutSessionId)}
            disabled={isSyncing}
          >
            {isSyncing ? "Refreshing..." : "Refresh subscription"}
          </Button>
          <Button
            variant="ghost"
            onClick={onOpenPortal}
            disabled={isOpeningPortal || !props.canOpenPortal}
          >
            {isOpeningPortal ? "Opening..." : "Manage billing"}
          </Button>
        </div>
      </Card>

      {showEmbeddedCheckout ? (
        <Card>
          <CardHeader
            title="Secure checkout"
            description="Payment is handled by Stripe Embedded Checkout inside this page."
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmbeddedCheckout(false);
                  setCheckoutClientSecret(null);
                }}
              >
                Close
              </Button>
            }
          />
          {!stripePromise ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              Missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
            </div>
          ) : checkoutClientSecret ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret: checkoutClientSecret,
                onComplete: onCheckoutComplete,
              }}
            >
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]/70 bg-white">
                <EmbeddedCheckout />
              </div>
            </EmbeddedCheckoutProvider>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Checkout session is being prepared.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
