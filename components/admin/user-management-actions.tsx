"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { UserRole, UserStatus } from "@/lib/auth-constants";

type Props = {
  userId: string;
  currentRole: string;
  currentStatus: string;
  emailVerified: boolean;
  viewerRole: UserRole;
};

export function UserManagementActions({
  userId,
  currentRole,
  currentStatus,
  emailVerified,
  viewerRole,
}: Props) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [status, setStatus] = useState(currentStatus);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [sendingAuthAction, setSendingAuthAction] = useState<null | string>(null);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, status, suspensionReason }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update that user.");
      return;
    }

    setMessage("User updated.");
    router.refresh();
  };

  const handleRevokeSessions = async () => {
    setRevoking(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/users/${userId}/sessions`, {
      method: "DELETE",
    });

    const data = await response.json();
    setRevoking(false);

    if (!response.ok) {
      setError(data.error ?? "Could not revoke sessions.");
      return;
    }

    setMessage(`Revoked ${data.revokedCount} active sessions.`);
    router.refresh();
  };

  const handleAuthAction = async (
    action: "SEND_INVITATION" | "SEND_PASSWORD_RESET" | "SEND_EMAIL_VERIFICATION"
  ) => {
    setSendingAuthAction(action);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/users/${userId}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const data = await response.json();
    setSendingAuthAction(null);

    if (!response.ok) {
      setError(data.error ?? "Could not complete that auth action.");
      return;
    }

    const defaultMessages: Record<typeof action, string> = {
      SEND_INVITATION: "Invitation processed.",
      SEND_PASSWORD_RESET: "Password reset flow processed.",
      SEND_EMAIL_VERIFICATION: "Verification flow processed.",
    };

    const baseMessage = data.message ?? defaultMessages[action];
    setMessage(data.debugUrl ? `${baseMessage} Local preview: ${data.debugUrl}` : baseMessage);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-[var(--color-muted)]">Role</label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="USER">User</option>
            {viewerRole === "SUPERADMIN" ? <option value="ADMIN">Admin</option> : null}
            {viewerRole === "SUPERADMIN" ? <option value="SUPERADMIN">Superadmin</option> : null}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--color-muted)]">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
            <option value="DELETED">Deleted</option>
          </Select>
        </div>
      </div>

      {status === "SUSPENDED" ? (
        <div>
          <label className="mb-1 block text-sm text-[var(--color-muted)]">Suspension reason</label>
          <Input
            value={suspensionReason}
            onChange={(e) => setSuspensionReason(e.target.value)}
            placeholder="Explain why access is being suspended"
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--color-success)]">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
        <Button variant="danger" onClick={handleRevokeSessions} disabled={revoking}>
          {revoking ? "Revoking..." : "Revoke all sessions"}
        </Button>
        {currentStatus === "INVITED" ? (
          <Button
            variant="secondary"
            onClick={() => handleAuthAction("SEND_INVITATION")}
            disabled={sendingAuthAction !== null}
          >
            {sendingAuthAction === "SEND_INVITATION" ? "Sending..." : "Resend invite"}
          </Button>
        ) : null}
        {currentStatus === "ACTIVE" ? (
          <Button
            variant="secondary"
            onClick={() => handleAuthAction("SEND_PASSWORD_RESET")}
            disabled={sendingAuthAction !== null}
          >
            {sendingAuthAction === "SEND_PASSWORD_RESET" ? "Sending..." : "Send reset email"}
          </Button>
        ) : null}
        {!emailVerified ? (
          <Button
            variant="secondary"
            onClick={() => handleAuthAction("SEND_EMAIL_VERIFICATION")}
            disabled={sendingAuthAction !== null}
          >
            {sendingAuthAction === "SEND_EMAIL_VERIFICATION" ? "Sending..." : "Send verification"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
