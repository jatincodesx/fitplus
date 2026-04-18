"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlatformSettingForm({
  initialKey,
  initialValue,
  description,
}: {
  initialKey: string;
  initialValue: string;
  description?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: initialKey,
        value,
        description,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update that setting.");
      return;
    }

    setMessage("Saved.");
    router.refresh();
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm text-[var(--color-muted)]">{initialKey}</label>
        <Input value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      {description ? <p className="text-sm text-[var(--color-muted)]">{description}</p> : null}
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--color-success)]">{message}</p> : null}
      <Button type="submit" variant="secondary" disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
