"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const token = params.token ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState(
    token ? "Verifying your email..." : "This verification link is invalid."
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Could not verify your email.");
        }
        setStatus("success");
        setMessage("Your email has been verified. You can continue into the product now.");
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message);
      });
  }, [token]);

  return (
    <AuthShell
      eyebrow="Verification"
      title="Verify your email"
      description="Password-based accounts keep verification enabled so account recovery and security actions stay trustworthy."
      footer={
        <Button asChild className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
          <Link href={status === "success" ? "/sign-in?notice=emailVerified" : "/sign-in"}>
            {status === "success" ? "Continue to sign in" : "Back to sign in"}
          </Link>
        </Button>
      }
    >
      <p
        className={`rounded-2xl border px-4 py-4 text-sm ${
          status === "error"
            ? "border-red-500/20 bg-red-500/10 text-red-100"
            : status === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
              : "border-white/10 bg-white/5 text-slate-300"
        }`}
      >
        {message}
      </p>
    </AuthShell>
  );
}
