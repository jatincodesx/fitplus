import type { Prisma, PrismaClient as PrismaClientType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientType;
  prismaAdapter?: PrismaPg;
  databaseUrlDiagnosticsLogged?: boolean;
};

type PrismaClientConstructor = new (options?: Prisma.PrismaClientOptions) => PrismaClientType;

type DatabaseConnectionKind =
  | "supabase-direct"
  | "supabase-pooler-transaction"
  | "supabase-pooler-session"
  | "other";

type DatabaseUrlEnvName = "DATABASE_URL" | "DIRECT_URL";

type DatabaseUrlDiagnostics = {
  envName: DatabaseUrlEnvName;
  present: boolean;
  protocol: string | null;
  host: string | null;
  port: string | null;
  connectionKind: DatabaseConnectionKind | null;
  looksLikePooler: boolean;
  looksLikeDirectSupabase: boolean;
};

const isCloudflareWorkerRuntime =
  typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined" &&
  typeof caches !== "undefined" &&
  typeof Response !== "undefined";

const { PrismaClient } = (isCloudflareWorkerRuntime
  ? require("@prisma/client/wasm")
  : require("@prisma/client")) as {
  PrismaClient: PrismaClientConstructor;
};

function getDatabaseConnectionKind(url: string): DatabaseConnectionKind {
  if (/@db\.[^.]+\.supabase\.co:5432\//i.test(url)) {
    return "supabase-direct";
  }

  if (/\.pooler\.supabase\.com:6543\//i.test(url)) {
    return "supabase-pooler-transaction";
  }

  if (/\.pooler\.supabase\.com:5432\//i.test(url)) {
    return "supabase-pooler-session";
  }

  return "other";
}

function createEmptyDiagnostics(envName: DatabaseUrlEnvName): DatabaseUrlDiagnostics {
  return {
    envName,
    present: false,
    protocol: null,
    host: null,
    port: null,
    connectionKind: null,
    looksLikePooler: false,
    looksLikeDirectSupabase: false,
  };
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();

  if (trimmed.length < 2) {
    return { normalizedValue: trimmed, hadWrappingQuotes: false };
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const isWrapped = (first === "\"" || first === "'") && first === last;

  return {
    normalizedValue: isWrapped ? trimmed.slice(1, -1).trim() : trimmed,
    hadWrappingQuotes: isWrapped,
  };
}

function countAuthorityAtSigns(value: string) {
  const schemeSeparatorIndex = value.indexOf("://");

  if (schemeSeparatorIndex === -1) {
    return 0;
  }

  const authority = value.slice(schemeSeparatorIndex + 3).split("/")[0] ?? "";
  return Array.from(authority).filter((character) => character === "@").length;
}

function containsPlaceholder(value: string) {
  return (
    /<[^>]+>/.test(value) ||
    /\bYOUR_(SUPABASE_PROJECT|PASSWORD|REGION)\b/.test(value) ||
    /\bYOUR_PASSWORD\b/.test(value)
  );
}

function createInvalidDatabaseUrlError(envName: DatabaseUrlEnvName, reason: string) {
  return new Error(`[database-url] ${envName} ${reason}`);
}

function parseDatabaseUrl(
  envName: DatabaseUrlEnvName,
  rawValue: string | undefined,
  options?: { required?: boolean }
) {
  const diagnostics = createEmptyDiagnostics(envName);
  const required = options?.required ?? false;

  if (!rawValue || !rawValue.trim()) {
    if (required) {
      throw createInvalidDatabaseUrlError(envName, "is missing.");
    }

    return { normalizedValue: null, diagnostics };
  }

  const { normalizedValue, hadWrappingQuotes } = stripWrappingQuotes(rawValue);

  if (!normalizedValue) {
    if (required) {
      throw createInvalidDatabaseUrlError(envName, "is empty.");
    }

    return { normalizedValue: null, diagnostics };
  }

  if (containsPlaceholder(normalizedValue)) {
    throw createInvalidDatabaseUrlError(
      envName,
      "still contains placeholder text such as `<project-ref>`, `<password>`, or `YOUR_...`."
    );
  }

  if (countAuthorityAtSigns(normalizedValue) > 1) {
    throw createInvalidDatabaseUrlError(
      envName,
      "looks malformed because the authority section contains multiple `@` characters. This usually means the password contains a raw `@`; encode it as `%40`."
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    const hints = [
      "must start with `postgresql://` or `postgres://`.",
      hadWrappingQuotes
        ? "Remove surrounding quotes when pasting the Cloudflare secret value."
        : null,
      rawValue.includes("\"") || rawValue.includes("'")
        ? "Do not include quote characters inside the secret value."
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    throw createInvalidDatabaseUrlError(envName, `is not a valid URL. ${hints}`);
  }

  if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
    throw createInvalidDatabaseUrlError(
      envName,
      `must use the PostgreSQL protocol, but received \`${parsedUrl.protocol}\`.`
    );
  }

  const connectionKind = getDatabaseConnectionKind(normalizedValue);

  return {
    normalizedValue,
    diagnostics: {
      envName,
      present: true,
      protocol: parsedUrl.protocol.replace(/:$/, ""),
      host: parsedUrl.hostname || null,
      port: parsedUrl.port || null,
      connectionKind,
      looksLikePooler:
        connectionKind === "supabase-pooler-transaction" || connectionKind === "supabase-pooler-session",
      looksLikeDirectSupabase: connectionKind === "supabase-direct",
    },
  };
}

function logDatabaseUrlDiagnostics(diagnostics: DatabaseUrlDiagnostics) {
  console.info("[database-url]", {
    envName: diagnostics.envName,
    present: diagnostics.present,
    protocol: diagnostics.protocol,
    host: diagnostics.host,
    port: diagnostics.port,
    looksLikePooler: diagnostics.looksLikePooler,
    looksLikeDirectSupabase: diagnostics.looksLikeDirectSupabase,
  });
}

export function validateDatabaseUrlForRuntime() {
  return parseDatabaseUrl("DATABASE_URL", process.env.DATABASE_URL, { required: true });
}

function getDirectUrlDiagnostics() {
  return parseDatabaseUrl("DIRECT_URL", process.env.DIRECT_URL);
}

const runtimeDatabaseUrl = validateDatabaseUrlForRuntime();
const directDatabaseUrl = getDirectUrlDiagnostics();
const connectionString = runtimeDatabaseUrl.normalizedValue;

if (!connectionString) {
  throw createInvalidDatabaseUrlError("DATABASE_URL", "is missing.");
}

if (!globalForPrisma.databaseUrlDiagnosticsLogged) {
  logDatabaseUrlDiagnostics(runtimeDatabaseUrl.diagnostics);
  logDatabaseUrlDiagnostics(directDatabaseUrl.diagnostics);
  globalForPrisma.databaseUrlDiagnosticsLogged = true;
}

if (
  isCloudflareWorkerRuntime &&
  process.env.NODE_ENV === "production" &&
  runtimeDatabaseUrl.diagnostics.looksLikeDirectSupabase
) {
  console.error("[prisma-runtime]", {
    message:
      "Cloudflare Workers is using a direct Supabase Postgres host. Switch DATABASE_URL to the Supabase transaction pooler or Hyperdrive to avoid connection hangs.",
    host: runtimeDatabaseUrl.diagnostics.host,
    port: runtimeDatabaseUrl.diagnostics.port,
  });
}

export const databaseRuntimeInfo = {
  runtime: isCloudflareWorkerRuntime ? "cloudflare-worker" : "node",
  databaseConnectionKind: runtimeDatabaseUrl.diagnostics.connectionKind,
  databaseUrlPresent: runtimeDatabaseUrl.diagnostics.present,
  directUrlPresent: directDatabaseUrl.diagnostics.present,
  runtimeHost: runtimeDatabaseUrl.diagnostics.host,
  runtimePort: runtimeDatabaseUrl.diagnostics.port,
  runtimeLooksLikePooler: runtimeDatabaseUrl.diagnostics.looksLikePooler,
  runtimeLooksLikeDirectSupabase: runtimeDatabaseUrl.diagnostics.looksLikeDirectSupabase,
};

const adapter =
  globalForPrisma.prismaAdapter ??
  new PrismaPg({
    connectionString,
    max: isCloudflareWorkerRuntime ? 1 : undefined,
    connectionTimeoutMillis: isCloudflareWorkerRuntime ? 5_000 : undefined,
    idleTimeoutMillis: isCloudflareWorkerRuntime ? 30_000 : undefined,
  });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdapter = adapter;
}
