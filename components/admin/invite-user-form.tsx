"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { UserRole } from "@/lib/auth-constants";

export function InviteUserForm({ actorRole }: { actorRole: UserRole }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not invite that user.");
      return;
    }

    const baseMessage = data.message ?? "Invitation processed.";
    setMessage(
      data.debugInviteUrl
        ? `${baseMessage} Local preview: ${data.debugInviteUrl}`
        : baseMessage
    );
    setName("");
    setEmail("");
    setRole("USER");
    router.refresh();
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
        <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="USER">User</option>
          {actorRole === "SUPERADMIN" ? <option value="ADMIN">Admin</option> : null}
        </Select>
      </div>
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--color-success)]">{message}</p> : null}
      <Button type="submit" variant="secondary" disabled={loading}>
        {loading ? "Inviting..." : "Invite user"}
      </Button>
    </form>
  );
}
