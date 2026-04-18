import type { NextConfig } from "next";

const ngrokOriginAndHostFromEnv = (() => {
  const raw = process.env.NGROK_URL?.trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = new URL(raw);
    return [parsed.origin, parsed.host];
  } catch {
    return [raw];
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.ngrok-free.app",
    ...ngrokOriginAndHostFromEnv,
  ],
};

export default nextConfig;
