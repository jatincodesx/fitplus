import { requireApiCustomerAppAccess } from "@/lib/auth";
import { ApiError, apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { getStripePriceIdForTier } from "@/lib/billing/plans";
import { ensureStripeCustomerForUser } from "@/lib/billing/subscriptions";
import { createCheckoutSessionSchema } from "@/lib/schemas/billing";
import { getStripeServerClient } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/tokens";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, createCheckoutSessionSchema);
    const requestContext = await getAuditRequestContext(req);

    const stripePriceId = getStripePriceIdForTier(payload.planTier);
    const customerId = await ensureStripeCustomerForUser(sessionUser.id);
    const stripe = getStripeServerClient();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      customer: customerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      client_reference_id: sessionUser.id,
      metadata: {
        userId: sessionUser.id,
        planTier: payload.planTier,
      },
      subscription_data: {
        metadata: {
          userId: sessionUser.id,
          planTier: payload.planTier,
        },
      },
      return_url: `${getBaseUrl()}/billing?session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!checkoutSession.client_secret) {
      throw new ApiError(500, "Stripe did not return an embedded checkout client secret.");
    }

    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "BILLING_CHECKOUT_SESSION_CREATED",
      entityType: "StripeCheckoutSession",
      entityId: checkoutSession.id,
      metadata: {
        planTier: payload.planTier,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({
      sessionId: checkoutSession.id,
      clientSecret: checkoutSession.client_secret,
    });
  } catch (error) {
    return handleApiError(error, "Could not create checkout session.");
  }
}
