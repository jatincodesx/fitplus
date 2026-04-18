import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const apiOk = <T>(payload: T, init?: ResponseInit) => NextResponse.json(payload, init);

export const apiError = (status: number, error: string, code?: string) =>
  NextResponse.json({ error, ...(code ? { code } : {}) }, { status });

export async function parseJsonBody<TOutput>(
  request: Request,
  schema: ZodType<TOutput>
): Promise<TOutput> {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request payload.", "INVALID_PAYLOAD");
  }

  return parsed.data;
}

export function handleApiError(
  error: unknown,
  fallbackMessage = "Something went wrong."
) {
  if (error instanceof ApiError) {
    return apiError(error.status, error.message, error.code);
  }

  console.error(error);
  return apiError(500, fallbackMessage);
}
