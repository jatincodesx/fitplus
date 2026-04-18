"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LinkedAccount = {
  id: string;
  provider: string;
  createdAt: string;
};

type ActiveSession = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  updatedAt: string;
  expires: string;
  isCurrent: boolean;
};

type Props = {
  name: string;
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  linkedAccounts: LinkedAccount[];
  sessions: ActiveSession[];
  availableProviders: {
    google: boolean;
    apple: boolean;
  };
};

export function AccountSettingsPanels({
  name,
  email,
  emailVerified,
  hasPassword,
  linkedAccounts,
  sessions,
  availableProviders,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const linkedProviderSet = new Set(linkedAccounts.map((account) => account.provider));

  const refreshWithMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    setError("");
    router.refresh();
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update your profile.");
      return;
    }

    refreshWithMessage("Profile updated.");
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPassword || undefined,
        newPassword,
        confirmPassword,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update your password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    refreshWithMessage("Password updated. Other sessions were revoked.");
  };

  const handleDisconnectProvider = async (provider: string) => {
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/account/providers/${provider}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not disconnect that provider.");
      return;
    }

    refreshWithMessage(`${provider} disconnected.`);
  };

  const handleRevokeSession = async (sessionId: string) => {
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/account/sessions/${sessionId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not revoke that session.");
      return;
    }

    refreshWithMessage("Session revoked.");
  };

  const handleDeletionRequest = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/account/delete-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not submit the deletion request.");
      return;
    }

    refreshWithMessage("Deletion request submitted.");
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not resend verification.");
      return;
    }

    const baseMessage = data.message ?? "Verification flow processed.";
    refreshWithMessage(
      data.debugVerificationUrl
        ? `${baseMessage} Local preview: ${data.debugVerificationUrl}`
        : baseMessage
    );
  };

  const handleConnectProvider = async (provider: "google" | "apple") => {
    setLoading(true);
    await signIn(provider, { callbackUrl: "/profile" });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <CardHeader title="Account settings" description="Identity, verification, and basic profile" />
          <form className="space-y-4" onSubmit={handleProfileSave}>
            <div>
              <label className="mb-1 block text-sm text-[var(--color-muted)]">Full name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-sm">
              <p><span className="font-semibold text-foreground">Email:</span> {email}</p>
              <p className="mt-2">
                <span className="font-semibold text-foreground">Verification:</span>{" "}
                {emailVerified ? "Verified" : "Pending verification"}
              </p>
              {!emailVerified ? (
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleResendVerification} disabled={loading}>
                  Resend verification
                </Button>
              ) : null}
            </div>
            <Button type="submit" variant="secondary" disabled={loading}>
              Save account details
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <CardHeader title="Password" description="Set or rotate your email/password sign-in" />
          <form className="space-y-4" onSubmit={handlePasswordSave}>
            {hasPassword ? (
              <div>
                <label className="mb-1 block text-sm text-[var(--color-muted)]">Current password</label>
                <Input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                />
              </div>
            ) : (
              <p className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-sm text-[var(--color-muted)]">
                No password is set yet. Saving here will add email/password sign-in to your account.
              </p>
            )}
            <div>
              <label className="mb-1 block text-sm text-[var(--color-muted)]">New password</label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--color-muted)]">Confirm password</label>
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={loading}>
              Save password
            </Button>
          </form>
        </Card>
      </div>

      <Card className="space-y-4">
        <CardHeader title="Connected sign-in methods" description="Link or remove OAuth providers safely" />
        <div className="grid gap-4 md:grid-cols-2">
          {(["google", "apple"] as const).map((provider) => {
            const available = availableProviders[provider];
            const isLinked = linkedProviderSet.has(provider);

            return (
              <div key={provider} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">{provider}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {available ? (isLinked ? "Linked to this account" : "Available to connect") : "Provider env vars missing"}
                    </p>
                  </div>
                  {available ? (
                    isLinked ? (
                      <Button variant="secondary" size="sm" onClick={() => handleDisconnectProvider(provider)} disabled={loading}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => handleConnectProvider(provider)} disabled={loading}>
                        Connect
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
            <p className="font-semibold">Email + password</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {hasPassword ? "Enabled on this account." : "Not configured yet."}
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="Active sessions" description="See and revoke device access" />
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{session.userAgent ?? "Unknown device"}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {session.ipAddress ?? "IP unavailable"} · Last active {new Date(session.updatedAt).toLocaleString()}
                  </p>
                </div>
                {session.isCurrent ? (
                  <span className="rounded-full bg-[var(--color-success)]/15 px-3 py-1 text-xs text-[var(--color-success)]">
                    Current session
                  </span>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => handleRevokeSession(session.id)} disabled={loading}>
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border-[var(--color-danger)]/20 bg-[var(--color-danger)]/7">
        <CardHeader title="Account deletion request" description="Soft-delete workflow with admin review" />
        <p className="text-sm text-[var(--color-muted)]">
          This does not immediately hard delete your account. It flags the account for operational review and safe retention handling.
        </p>
        <Button variant="danger" onClick={handleDeletionRequest} disabled={loading}>
          Request account deletion
        </Button>
      </Card>

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--color-success)]">{message}</p> : null}
    </div>
  );
}
