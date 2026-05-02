import { getApiSessionUser } from "@/lib/auth";
import { ApiError, apiOk, handleApiError } from "@/lib/api";
import { prisma, databaseRuntimeInfo } from "@/lib/prisma";

const STEP_TIMEOUT_MS = Number(process.env.DEBUG_DB_STEP_TIMEOUT_MS ?? 4_000);

type DiagnosticStep = {
  name: string;
  ok: boolean;
  durationMs: number;
  detail: string;
};

async function runStep(name: string, task: () => Promise<string>): Promise<DiagnosticStep> {
  const startedAt = Date.now();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`DebugTimeout:${name}`)), STEP_TIMEOUT_MS);
    });

    const detail = await Promise.race([task(), timeout]);

    return {
      name,
      ok: true,
      durationMs: Date.now() - startedAt,
      detail,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : "UnknownError",
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const sessionUser = await getApiSessionUser(request);
    if (!sessionUser || sessionUser.status !== "ACTIVE") {
      throw new ApiError(401, "Unauthorized.");
    }

    if (sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPERADMIN") {
      throw new ApiError(403, "Forbidden.");
    }

    const simpleQuery = await runStep("simple-query", async () => {
      const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 AS result`;
      return String(result[0]?.result ?? 1);
    });

    const userQuery =
      sessionUser
        ? await runStep("user-query", async () => {
            const user = await prisma.user.findUnique({
              where: { id: sessionUser.id },
              select: { id: true },
            });
            return user ? "found" : "missing";
          })
        : null;

    return apiOk({
      ok: simpleQuery.ok && (userQuery ? userQuery.ok : true),
      databaseUrlPresent: databaseRuntimeInfo.databaseUrlPresent,
      directUrlPresent: databaseRuntimeInfo.directUrlPresent,
      runtimeHost: databaseRuntimeInfo.runtimeHost,
      runtimePort: databaseRuntimeInfo.runtimePort,
      runtimeLooksLikePooler: databaseRuntimeInfo.runtimeLooksLikePooler,
      runtimeLooksLikeDirectSupabase: databaseRuntimeInfo.runtimeLooksLikeDirectSupabase,
      runtime: databaseRuntimeInfo.runtime,
      databaseConnectionKind: databaseRuntimeInfo.databaseConnectionKind,
      stepTimeoutMs: STEP_TIMEOUT_MS,
      simpleQuery,
      auth: {
        authenticated: true,
        role: sessionUser.role,
      },
      userQuery,
    });
  } catch (error) {
    return handleApiError(error, "Could not run database diagnostics.");
  }
}
