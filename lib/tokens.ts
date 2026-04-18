import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AuthTokenType } from "@/lib/auth-constants";

const TOKEN_BYTE_LENGTH = 32;

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const generateRawToken = () => randomBytes(TOKEN_BYTE_LENGTH).toString("hex");

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

export const getBaseUrl = () => {
  if (process.env.APP_BASE_URL) {
    return normalizeBaseUrl(process.env.APP_BASE_URL);
  }

  if (process.env.NEXTAUTH_URL) {
    return normalizeBaseUrl(process.env.NEXTAUTH_URL);
  }

  if (process.env.VERCEL_URL) {
    return normalizeBaseUrl(`https://${process.env.VERCEL_URL}`);
  }

  return "http://localhost:3000";
};

type CreateUserTokenInput = {
  type: AuthTokenType;
  email: string;
  userId?: string | null;
  createdById?: string | null;
  expiresInHours: number;
  metadata?: Record<string, unknown> | null;
};

export async function createUserToken(input: CreateUserTokenInput) {
  const token = generateRawToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);

  await prisma.userToken.create({
    data: {
      userId: input.userId ?? null,
      email: input.email,
      type: input.type,
      tokenHash,
      expiresAt,
      createdById: input.createdById ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function findActiveUserToken(type: AuthTokenType, token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.userToken.findFirst({
    where: {
      type,
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: true,
    },
  });

  return record;
}

export async function consumeUserToken(type: AuthTokenType, token: string) {
  const record = await findActiveUserToken(type, token);

  if (!record) {
    return null;
  }

  await prisma.userToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return record;
}

export async function invalidateUserTokensByType(email: string, type: AuthTokenType) {
  await prisma.userToken.updateMany({
    where: {
      email,
      type,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });
}
