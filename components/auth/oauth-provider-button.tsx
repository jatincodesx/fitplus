"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21.8 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.55Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.75 0 5.06-.91 6.74-2.46l-3.3-2.56c-.91.61-2.07.98-3.44.98-2.64 0-4.88-1.78-5.68-4.18H2.91v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.32 13.78a6 6 0 0 1 0-3.56V7.58H2.91a10 10 0 0 0 0 8.84l3.41-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.04c1.5 0 2.84.52 3.9 1.52l2.93-2.93A9.8 9.8 0 0 0 12 2 10 10 0 0 0 2.91 7.58l3.41 2.64C7.12 7.82 9.36 6.04 12 6.04Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M15.33 2c.1 1.2-.36 2.36-1.05 3.14-.73.82-1.93 1.45-3.05 1.36-.14-1.13.4-2.3 1.1-3 .78-.8 2.04-1.4 3-1.5ZM19.2 17.36c-.58 1.3-.85 1.88-1.6 3.03-1.05 1.63-2.54 3.67-4.4 3.69-1.64.02-2.06-1.05-4.29-1.04-2.23.01-2.69 1.06-4.33 1.04-1.86-.02-3.27-1.86-4.31-3.49C-2.63 16.53.4 10.35 4.13 10.18c1.8-.09 3.5 1.21 4.6 1.21 1.1 0 3.17-1.5 5.34-1.28.9.04 3.42.37 5.04 2.75-.13.08-3.01 1.76-2.98 5.25.03 4.17 3.67 5.55 3.71 5.57-.03.1-.58 1.99-1.64 4.68Z" />
    </svg>
  );
}

const iconMap = {
  google: GoogleIcon,
  apple: AppleIcon,
};

export function OAuthProviderButton({
  provider,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { provider: "google" | "apple" }) {
  const Icon = iconMap[provider];

  return (
    <Button type="button" variant="secondary" className="w-full justify-center gap-3 bg-white/6 py-3 text-sm" {...props}>
      <Icon />
      {children}
    </Button>
  );
}
