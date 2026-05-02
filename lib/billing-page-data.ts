import "server-only";

import { prisma } from "@/lib/prisma";

export async function getBillingPageData(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscription: {
        select: {
          plan: true,
          planTier: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          externalCustomerId: true,
        },
      },
      billingProfile: {
        select: {
          customerId: true,
        },
      },
    },
  });
}
