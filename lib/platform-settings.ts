import "server-only";

import { prisma } from "@/lib/prisma";

type ParsedPlatformSetting = string | number | boolean | null;

function parsePlatformSettingValue(value: string | null): ParsedPlatformSetting {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as ParsedPlatformSetting;
  } catch {
    return value;
  }
}

export async function getPlatformSettingValue(key: string) {
  const setting = await prisma.platformSetting.findUnique({
    where: { key },
    select: { value: true },
  });

  return parsePlatformSettingValue(setting?.value ?? null);
}

export async function getBooleanPlatformSetting(key: string, fallback: boolean) {
  const value = await getPlatformSettingValue(key);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

export async function getStringPlatformSetting(key: string, fallback: string | null = null) {
  const value = await getPlatformSettingValue(key);
  return typeof value === "string" ? value : fallback;
}

export async function isSelfSignupEnabled() {
  return getBooleanPlatformSetting("self_signup_enabled", true);
}
