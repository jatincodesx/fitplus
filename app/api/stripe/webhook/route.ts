import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { apiError, apiOk } from "@/lib/api";
import {
  syncLatestSubscriptionFromStripeCustomer,
  syncSubscriptionFromCheckoutSessionId,
  syncSubscriptionFromStripeSubscription,
} from "@/lib/billing/subscriptions";
import { getStripeServerClient, getStripeWebhookSecret } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function syncFromInvoiceEvent(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  const stripe = getStripeServerClient();
  const parentSubscription = invoice.parent?.subscription_details?.subscription;

  if (typeof parentSubscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(parentSubscription);
    await syncSubscriptionFromStripeSubscription(subscription);
    return;
  }

  if (parentSubscription && typeof parentSubscription !== "string") {
    await syncSubscriptionFromStripeSubscription(parentSubscription);
    return;
  }

  if (customerId) {
    await syncLatestSubscriptionFromStripeCustomer(customerId);
  }
}

export async function POST(request: Request) {
  const stripeSignature = request.headers.get("stripe-signature");
  if (!stripeSignature) {
    return apiError(400, "Missing Stripe signature.");
  }

  const stripe = getStripeServerClient();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, stripeSignature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify webhook signature.";
    return apiError(400, message);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncSubscriptionFromCheckoutSessionId(session.id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripeSubscription(subscription);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await syncFromInvoiceEvent(invoice);
        break;
      }
      default:
        break;
    }

    revalidatePath("/billing");
    revalidatePath("/profile");
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/security");
    return apiOk({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error", {
      eventId: event.id,
      eventType: event.type,
      error,
    });
    return apiError(500, "Webhook processing failed.");
  }
}
