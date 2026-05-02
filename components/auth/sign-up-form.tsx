"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { OAuthProviderButton } from "@/components/auth/oauth-provider-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AUTH_REQUEST_TIMEOUT_MS = 15000;

function authDebug(event: string, metadata?: Record<string, unknown>) {
  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[auth-ui] ${event}${payload}`);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function SignUpForm({
  providers,
}: {
  providers: { google: boolean; apple: boolean };
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const oauthOptions = [
    {
      id: "google" as const,
      label: "Continue with Google",
      available: providers.google,
      unavailableLabel: "Google sign-up unavailable",
    },
    {
      id: "apple" as const,
      label: "Continue with Apple",
      available: providers.apple,
      unavailableLabel: "Apple sign-up unavailable",
    },
  ];

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    authDebug("sign-up-submit-start");

    try {
      const response = await withTimeout(
        fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        AUTH_REQUEST_TIMEOUT_MS,
        "Sign-up request timed out. Please try again."
      );
      const data = (await response.json()) as { error?: string };

      authDebug("sign-up-submit-response", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        setError(data.error ?? "Could not create account.");
        return;
      }

      const signInResponse = await withTimeout(
        signIn("credentials", {
          redirect: false,
          email: form.email,
          password: form.password,
          callbackUrl: "/onboarding",
        }),
        AUTH_REQUEST_TIMEOUT_MS,
        "Account created, but sign-in timed out. Please sign in manually."
      );

      authDebug("sign-up-auto-sign-in-response", {
        hasResult: Boolean(signInResponse),
        hasError: Boolean(signInResponse?.error),
        hasUrl: Boolean(signInResponse?.url),
      });

      if (!signInResponse) {
        setError("Account created, but sign-in did not return a response. Please sign in manually.");
        return;
      }

      if (signInResponse.error) {
        setError("Account created, but automatic sign-in failed. Please sign in manually.");
        return;
      }

      const targetUrl = signInResponse.url ?? "/onboarding";
      authDebug("sign-up-success", { targetUrl });
      authDebug("sign-up-navigate", { targetUrl });
      window.location.replace(targetUrl);
    } catch (error) {
      authDebug("sign-up-submit-failure", {
        error: error instanceof Error ? error.message : "UnknownError",
      });
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Could not create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    authDebug("oauth-sign-up-start", { provider });

    try {
      await withTimeout(
        signIn(provider, { callbackUrl: "/auth/complete" }),
        AUTH_REQUEST_TIMEOUT_MS,
        "The provider sign-up request timed out. Please try again."
      );
    } catch (error) {
      authDebug("oauth-sign-up-failure", {
        provider,
        error: error instanceof Error ? error.message : "UnknownError",
      });
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Could not start provider sign-up. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {oauthOptions.map((provider) => (
          <OAuthProviderButton
            key={provider.id}
            provider={provider.id}
            onClick={() => handleOAuth(provider.id)}
            disabled={loading || !provider.available}
          >
            {provider.available ? provider.label : provider.unavailableLabel}
          </OAuthProviderButton>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
        <div className="h-px flex-1 bg-white/10" />
        {oauthOptions.some((provider) => provider.available) ? "Or create with email" : "Create with email"}
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Full name</label>
          <Input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Email</label>
          <Input name="email" value={form.email} onChange={handleChange} type="email" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Password</label>
          <Input
            name="password"
            value={form.password}
            onChange={handleChange}
            type="password"
            minLength={8}
            required
          />
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Email/password signup creates a normal customer account only. Admin and superadmin access are assigned separately.
          </p>
        )}

        <Button type="submit" className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="space-y-3 text-sm text-slate-300">
        <p>
          Already have an account?{" "}
          <Link href="/sign-in" prefetch={false} className="font-semibold text-cyan-300 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-slate-400">
          Password-based signups generate email verification links automatically. Delivery requires a configured email provider. Google and Apple accounts are treated as verified when the provider confirms the email.
        </p>
        {!providers.google || !providers.apple ? (
          <p className="text-xs text-slate-500">
            Missing provider env vars keep that social sign-up option disabled in this environment.
          </p>
        ) : null}
      </div>
    </div>
  );
}
