import "server-only";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type AuditMetadata =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null
  | undefined;

export type AuditLogInput = {
  actorUserId?: string | null;
  targetUserId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: AuditMetadata;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type RequestLike = Request | Headers | { headers: HeadersInit };

const serializeMetadata = (metadata: AuditMetadata) => {
  if (metadata === undefined) {
    return null;
  }

  if (typeof metadata === "string") {
    return metadata;
  }

  return JSON.stringify(metadata);
};

const getHeadersFromRequestLike = (request?: RequestLike) => {
  if (!request) {
    return null;
  }

  if (request instanceof Headers) {
    return request;
  }

  if ("headers" in request) {
    return request.headers instanceof Headers ? request.headers : new Headers(request.headers);
  }

  return null;
};

export async function getAuditRequestContext(request?: RequestLike) {
  const requestHeaders = getHeadersFromRequestLike(request);
  if (requestHeaders) {
    return {
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        requestHeaders.get("x-real-ip"),
      userAgent: requestHeaders.get("user-agent"),
    };
  }

  if (request) {
    return {
      ipAddress: null,
      userAgent: null,
    };
  }

  try {
    const headerList = await headers();
    return {
      ipAddress:
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerList.get("x-real-ip"),
      userAgent: headerList.get("user-agent"),
    };
  } catch {
    return {
      ipAddress: null,
      userAgent: null,
    };
  }
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      eventType: input.eventType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: serializeMetadata(input.metadata),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
