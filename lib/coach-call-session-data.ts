import "server-only";

import { prisma } from "@/lib/prisma";

export async function createCoachCallSession(userId: string) {
  return prisma.coachCallSession.create({
    data: {
      userId,
      status: "CONNECTING",
    },
  });
}

export async function getLatestCoachCallSession(userId: string) {
  return prisma.coachCallSession.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      transcripts: { orderBy: { timestamp: "asc" } },
      intake: true,
      planLog: true,
    },
  });
}

export async function getCoachCallSession(userId: string, sessionId: string) {
  return prisma.coachCallSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      transcripts: { orderBy: { timestamp: "asc" } },
      intake: true,
      planLog: true,
    },
  });
}
