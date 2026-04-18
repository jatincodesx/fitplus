"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { OAuthProviderButton } from "@/components/auth/oauth-provider-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const router = useRouter();
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
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError(authErrorMessages[result.error] ?? "Could not sign in. Please try again.");
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    await signIn(provider, { callbackUrl });
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
            <Link href="/forgot-password" className="text-xs text-cyan-300 hover:underline">
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
          <Link href="/sign-up" className="font-semibold text-cyan-300 hover:underline">
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
