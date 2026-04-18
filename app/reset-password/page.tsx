"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const token = params.token ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not reset your password.");
      return;
    }

    router.push("/sign-in?notice=passwordReset");
  };

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Choose a new password"
      description="Resetting your password revokes previous sessions and secures the account for future sign-in."
      footer={
        <p className="text-sm text-slate-300">
          <Link href="/sign-in" className="font-semibold text-cyan-300 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-slate-300">New password</label>
          <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Confirm password</label>
          <Input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            required
          />
        </div>
        {error ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        <Button type="submit" className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={loading || !token}>
          {loading ? "Saving..." : "Reset password"}
        </Button>
      </form>
    </AuthShell>
  );
}
