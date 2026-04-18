const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

function configurationError(message: string): never {
  throw new Error(`[mobile-api] ${message}`);
}

function resolveApiBaseUrl(value: string | undefined): string {
  if (!value) {
    configurationError(
      "Missing EXPO_PUBLIC_API_BASE_URL. Set it in mobile/.env to your backend origin, for example http://192.168.1.206:3000."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    configurationError(
      `Invalid EXPO_PUBLIC_API_BASE_URL "${value}". Expected an absolute http:// or https:// URL.`
    );
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    configurationError(
      `Invalid EXPO_PUBLIC_API_BASE_URL "${value}". Only http:// and https:// are supported.`
    );
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    configurationError(
      `Invalid EXPO_PUBLIC_API_BASE_URL "${value}". Use only the backend origin, without a path, query, or hash.`
    );
  }

  return parsed.origin;
}

export const MOBILE_API_BASE_URL = resolveApiBaseUrl(envApiBaseUrl);

export function getMobileApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    configurationError(`API path "${path}" must start with "/".`);
  }

  return new URL(path, MOBILE_API_BASE_URL).toString();
}

if (__DEV__) {
  console.info(`[mobile-api] Using backend ${MOBILE_API_BASE_URL}`);
}
