"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not process the request.");
      return;
    }

    const baseMessage =
      data.message ?? "If an account exists for that email, a reset link has been sent.";
    setMessage(
      data.debugResetUrl ? `${baseMessage} Local preview: ${data.debugResetUrl}` : baseMessage
    );
  };

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Reset your password"
      description="Enter your email and the system will send a secure password reset link if the account exists."
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
          <label className="mb-1 block text-sm text-slate-300">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </div>
        {error ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
        <Button type="submit" className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
