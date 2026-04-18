"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Reviewing your goals", detail: "Aligning to your priority and timeline." },
  { title: "Checking your schedule", detail: "Balancing weekly frequency with recovery." },
  { title: "Adapting for equipment", detail: "Picking movements you can actually do." },
  { title: "Considering limitations", detail: "Protecting joints and avoiding pain triggers." },
  { title: "Building your split", detail: "Structuring volume and intensity smartly." },
  { title: "Personalizing nutrition", detail: "Macros that fit your goal and training load." },
  { title: "Finalizing your plan", detail: "Saving workouts and diet into your account." },
];

export default function GeneratingPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const params = use(searchParams);
  const router = useRouter();
  const sessionId = params.sessionId ?? null;
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.push("/coach-call");
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        setRunning(true);
        // check existing status
        const statusRes = await fetch(`/api/coach-call/session?sessionId=${sessionId}`);
        if (statusRes.ok) {
          const existing = await statusRes.json();
          if (existing.generationStatus === "COMPLETED") {
            router.replace(`/coach-call/summary?sessionId=${sessionId}`);
            return;
          }
          if (existing.generationStatus === "FAILED") {
            setError(existing.generationError || "Generation failed");
            return;
          }
        }
        const res = await fetch("/api/coach-call/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        if (cancelled) return;
        router.replace(`/coach-call/summary?sessionId=${sessionId}`);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        if (!cancelled) {
          setRunning(false);
        }
      }
    };
    run();
    const interval = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, steps.length - 1));
    }, 900);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router, sessionId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Coach Session</p>
          <h1 className="text-3xl font-semibold">Building your plans</h1>
          <p className="text-sm text-[var(--color-muted)]">
            We’re generating your workout and nutrition plan with your constraints and preferences.
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        {steps.map((step, idx) => {
          const state =
            idx < activeStep ? "done" : idx === activeStep ? "active" : "pending";
          return (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-border)]/60 bg-black/20 px-4 py-3"
            >
              {state === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
              ) : state === "active" ? (
                <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" />
              ) : (
                <div className="h-5 w-5 rounded-full border border-[var(--color-border)]" />
              )}
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-[var(--color-muted)]">{step.detail}</p>
              </div>
            </div>
          );
        })}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="flex justify-end">
          {error ? (
            <Button variant="secondary" onClick={() => router.push("/coach-call")}>
              Chat again
            </Button>
          ) : (
            <Button variant="secondary" disabled={running}>
              <Loader2 className="h-4 w-4 animate-spin" /> Working
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
