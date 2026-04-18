"use client";

import Link from "next/link";
import { use, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const token = params.token ?? "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password, confirmPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "Could not accept the invitation.");
      return;
    }

    await signIn("credentials", {
      email: data.email,
      password,
      callbackUrl: "/onboarding",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b0d14] via-[#0f172a] to-[#07080f] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Invitation</p>
        <h1 className="mt-2 text-3xl font-semibold">Accept your invitation</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-[var(--color-muted)]">Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-[var(--color-muted)]">Create password</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <div>
            <label className="text-sm text-[var(--color-muted)]">Confirm password</label>
            <Input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? "Joining..." : "Accept invitation"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          <Link href="/sign-in" className="text-[var(--color-accent)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
