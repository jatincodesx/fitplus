"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-route-error]", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-red-200">Route load failed</p>
      <h2 className="text-2xl font-semibold text-red-100">This screen could not finish loading.</h2>
      <p className="text-sm text-red-100/90">
        The request failed before the route finished rendering. Retry now, and check worker logs if this keeps happening.
      </p>
      <div>
        <Button type="button" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  );
}
