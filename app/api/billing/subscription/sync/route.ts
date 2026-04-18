import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, handleApiError, parseJsonBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  syncLatestSubscriptionFromStripeCustomer,
  syncSubscriptionFromCheckoutSessionId,
} from "@/lib/billing/subscriptions";

const syncSubscriptionSchema = z
  .object({
    sessionId: z.string().trim().min(1).optional(),
  })
  .default({});

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, syncSubscriptionSchema);

    if (payload.sessionId) {
      await syncSubscriptionFromCheckoutSessionId(payload.sessionId, sessionUser.id);
    } else {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: sessionUser.id },
        select: { externalCustomerId: true },
      });

      const customerId = subscription?.externalCustomerId;
      if (customerId) {
        await syncLatestSubscriptionFromStripeCustomer(customerId, sessionUser.id);
      }
    }

    const updatedSubscription = await prisma.subscription.findUnique({
      where: { userId: sessionUser.id },
      select: {
        plan: true,
        planTier: true,
        status: true,
        provider: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });

    revalidatePath("/billing");
    revalidatePath("/profile");
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/security");

    return apiOk({
      subscription: updatedSubscription,
    });
  } catch (error) {
    return handleApiError(error, "Could not sync subscription status.");
  }
}
