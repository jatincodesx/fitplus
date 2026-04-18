import { requireApiCustomerAppAccess } from "@/lib/auth";
import { ApiError, apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { ensureStripeCustomerForUser } from "@/lib/billing/subscriptions";
import { createPortalSessionSchema } from "@/lib/schemas/billing";
import { getStripeServerClient } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/tokens";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, createPortalSessionSchema);
    const customerId = await ensureStripeCustomerForUser(sessionUser.id);
    const stripe = getStripeServerClient();

    const normalizedReturnPath =
      payload.returnPath && payload.returnPath.startsWith("/") ? payload.returnPath : "/billing";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getBaseUrl()}${normalizedReturnPath}`,
    });

    if (!portalSession.url) {
      throw new ApiError(500, "Stripe did not return a customer portal URL.");
    }

    return apiOk({
      url: portalSession.url,
    });
  } catch (error) {
    return handleApiError(error, "Could not create a billing portal session.");
  }
}
