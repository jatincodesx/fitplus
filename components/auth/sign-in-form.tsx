"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { OAuthProviderButton } from "@/components/auth/oauth-provider-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AUTH_REQUEST_TIMEOUT_MS = 15000;

const authErrorMessages: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "You do not have access to that resource.",
  OAuthAccountNotLinked: "Use your current sign-in method first, then connect the provider from account settings.",
  AccountDisabled: "This account is not active. Contact support if you need help.",
  MissingEmail: "That provider did not return an email address.",
  Callback: "The authentication callback failed. Please try again.",
};

const noticeMessages: Record<string, string> = {
  passwordReset: "Password updated. Sign in with your new credentials.",
  emailVerified: "Your email is now verified.",
};

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

export function SignInForm({
  initialEmail = "",
  initialError,
  notice,
  callbackUrl,
  providers,
}: {
  initialEmail?: string;
  initialError?: string;
  notice?: string;
  callbackUrl: string;
  providers: { google: boolean; apple: boolean };
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    initialError ? authErrorMessages[initialError] ?? "Could not sign in. Please try again." : ""
  );
  const [loading, setLoading] = useState(false);

  const oauthOptions = [
    {
      id: "google" as const,
      label: "Continue with Google",
      available: providers.google,
      unavailableLabel: "Google sign-in unavailable",
    },
    {
      id: "apple" as const,
      label: "Continue with Apple",
      available: providers.apple,
      unavailableLabel: "Apple sign-in unavailable",
    },
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    authDebug("sign-in-submit-start", { callbackUrl });

    try {
      const result = await withTimeout(
        signIn("credentials", {
          redirect: false,
          email,
          password,
          callbackUrl,
        }),
        AUTH_REQUEST_TIMEOUT_MS,
        "Sign-in request timed out. Please try again."
      );

      authDebug("sign-in-submit-response", {
        hasResult: Boolean(result),
        hasError: Boolean(result?.error),
        hasUrl: Boolean(result?.url),
      });

      if (!result) {
        throw new Error("No response from authentication service.");
      }

      if (result.error) {
        setError(authErrorMessages[result.error] ?? "Could not sign in. Please try again.");
        return;
      }

      const targetUrl = result.url ?? callbackUrl;
      authDebug("sign-in-submit-success", { targetUrl });
      authDebug("sign-in-navigate", { targetUrl });
      window.location.replace(targetUrl);
    } catch (error) {
      authDebug("sign-in-submit-failure", {
        error: error instanceof Error ? error.message : "UnknownError",
      });
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Could not sign in. Please try again."
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
    authDebug("oauth-sign-in-start", { provider, callbackUrl });

    try {
      await withTimeout(
        signIn(provider, { callbackUrl }),
        AUTH_REQUEST_TIMEOUT_MS,
        "The provider sign-in request timed out. Please try again."
      );
    } catch (error) {
      authDebug("oauth-sign-in-failure", {
        provider,
        error: error instanceof Error ? error.message : "UnknownError",
      });
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Could not start provider sign-in. Please try again."
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
        {oauthOptions.some((provider) => provider.available) ? "Or continue with email" : "Email sign in"}
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm text-slate-300">Password</label>
            <Link href="/forgot-password" prefetch={false} className="text-xs text-cyan-300 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
        </div>

        {notice && noticeMessages[notice] ? (
          <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {noticeMessages[notice]}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="space-y-3 text-sm text-slate-300">
        <p>
          New here?{" "}
          <Link href="/sign-up" prefetch={false} className="font-semibold text-cyan-300 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-xs text-slate-400">
          Matching email addresses reuse the same account across password, Google, and Apple sign-in.
        </p>
        {!providers.google || !providers.apple ? (
          <p className="text-xs text-slate-500">
            Missing provider env vars keep that social sign-in option disabled in this environment.
          </p>
        ) : null}
      </div>
    </div>
  );
}
