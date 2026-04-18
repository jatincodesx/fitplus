"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerateNutritionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ai/nutrition", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not generate nutrition guidance.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not generate nutrition guidance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={generate} disabled={loading} className="flex items-center gap-2" variant="secondary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Updating macros..." : "Generate nutrition"}
      </Button>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
