"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronLeft, Clock3, Loader2, Sparkles } from "lucide-react";
import type { WorkoutSessionClientPayload } from "@/lib/workout-progress";

type WorkoutDayInput = {
  id: string;
  name: string;
  dayOfWeek?: string | null;
  focus?: string | null;
  rationale?: string | null;
  coachTip?: string | null;
  targetDurationMins?: number | null;
  exercises: {
    id: string;
    name: string;
    muscleGroup: string;
    sets: number;
    reps: number;
    restSeconds?: number | null;
    notes?: string | null;
  }[];
};

export function WorkoutSessionClient({
  day,
  initialSession,
}: {
  day: WorkoutDayInput;
  initialSession?: WorkoutSessionClientPayload | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSessionClientPayload | null>(initialSession ?? null);
  const [loading, setLoading] = useState(!initialSession);
  const [error, setError] = useState<string | null>(null);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function startWorkout(forceNew = false) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/workout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutDayId: day.id, forceNew }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not start workout.");
      }

      setSession(data.workoutSession);
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start workout.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialSession) return;

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/workout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workoutDayId: day.id }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Could not start workout.");
        }

        if (!cancelled) {
          setSession(data.workoutSession);
          startTransition(() => {
            router.refresh();
          });
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not start workout.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [day.id, initialSession, router]);

  async function updateSets(sessionExerciseId: string, completedSets: number) {
    if (!session) return;

    try {
      setPendingExerciseId(sessionExerciseId);
      setError(null);
      const res = await fetch(`/api/workout/session/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionExerciseId, completedSets }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not save progress.");
      }

      setSession(data.workoutSession);
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save progress.");
    } finally {
      setPendingExerciseId(null);
    }
  }

  async function completeWorkout() {
    if (!session) return;

    try {
      setFinishing(true);
      setError(null);
      const res = await fetch(`/api/workout/session/${session.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not complete workout.");
      }

      setSession(data.workoutSession);
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not complete workout.");
    } finally {
      setFinishing(false);
    }
  }

  const completed = session?.status === "COMPLETED";

  if (loading) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
          Preparing your session and syncing the plan snapshot.
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--color-accent)]/70" />
        </div>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="space-y-4 border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10">
        <h2 className="text-xl font-semibold">Could not start workout</h2>
        <p className="text-sm text-[var(--color-muted)]">
          {error ?? "Something prevented the workout session from starting."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" asChild>
            <Link href="/workouts">Return to workouts</Link>
          </Button>
          <Button onClick={() => router.refresh()}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6">
        <Card className="space-y-5 border-[var(--color-success)]/30 bg-[var(--color-success)]/8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[var(--color-success)]/15 p-3 text-[var(--color-success)]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Workout Complete</p>
              <h2 className="text-2xl font-semibold">{session.dayName}</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)]/60 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Exercises</p>
              <p className="mt-2 text-2xl font-semibold">
                {session.completedExercises}/{session.totalExercises}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/60 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Sets</p>
              <p className="mt-2 text-2xl font-semibold">
                {session.completedSets}/{session.totalSets}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/60 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Completion</p>
              <p className="mt-2 text-2xl font-semibold">{session.completionPercent}%</p>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)]/60 bg-black/20 p-4 text-sm text-[var(--color-muted)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Coach Feedback</p>
            <p className="mt-2 text-base text-foreground">
              {session.coachFeedback ?? "Strong work. Recover well and keep the next session just as clean."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void startWorkout(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Start again
            </Button>
            <Button asChild>
              <Link href="/workouts">Return to workouts</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5 overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.12),rgba(34,211,238,0.08),rgba(5,6,10,0.95))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              <Link href="/workouts" className="inline-flex items-center gap-1 hover:text-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
                Weekly plan
              </Link>
              <span>•</span>
              <span>{day.dayOfWeek ?? "Today"}</span>
            </div>
            <h2 className="text-3xl font-semibold">{day.name}</h2>
            <p className="max-w-2xl text-sm text-[var(--color-muted)]">
              {day.rationale ?? day.focus ?? "Move through the session in order and keep quality high on the first lifts."}
            </p>
          </div>
          <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Progress</p>
              <p className="mt-2 text-2xl font-semibold">{session.completionPercent}%</p>
              <p className="text-xs text-[var(--color-muted)]">
                {session.completedExercises}/{session.totalExercises} exercises complete
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Target</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold">
                <Clock3 className="h-5 w-5 text-[var(--color-accent)]" />
                {day.targetDurationMins ?? 50} min
              </p>
              <p className="text-xs text-[var(--color-muted)]">{session.totalSets} total working sets</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <span>Session progress</span>
            <span>{session.completedSets}/{session.totalSets} sets</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-accent-2))] transition-[width] duration-500"
              style={{ width: `${session.completionPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {day.coachTip && (
        <Card className="flex items-start gap-3 border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8">
          <span className="rounded-full bg-[var(--color-accent)]/15 p-2 text-[var(--color-accent)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Coach Cue</p>
            <p className="mt-1 text-sm text-foreground">{day.coachTip}</p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {session.exercises.map((exercise, index) => {
          const isPending = pendingExerciseId === exercise.id;
          const sets = Array.from({ length: exercise.setsTarget }, (_, setIndex) => setIndex + 1);

          return (
            <Card
              key={exercise.id}
              className={cn(
                "space-y-4 border transition-all duration-200",
                exercise.isCompleted
                  ? "border-[var(--color-success)]/25 bg-[var(--color-success)]/7"
                  : "border-[var(--color-border)]/70 bg-black/20"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)]">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold">{exercise.name}</h3>
                    {exercise.isCompleted && (
                      <span className="rounded-full bg-[var(--color-success)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--color-success)]">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">
                    {exercise.muscleGroup} · {exercise.setsTarget} sets x {exercise.repsTarget} reps ·{" "}
                    {exercise.restSeconds ?? 90}s rest
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Completed sets</p>
                  <p className="text-lg font-semibold">
                    {exercise.completedSets}/{exercise.setsTarget}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {sets.map((setNumber) => {
                  const active = setNumber <= exercise.completedSets;
                  return (
                    <button
                      key={setNumber}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        updateSets(
                          exercise.id,
                          active && setNumber === exercise.completedSets ? setNumber - 1 : setNumber
                        )
                      }
                      className={cn(
                        "inline-flex min-w-12 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-all",
                        active
                          ? "border-[var(--color-success)]/25 bg-[var(--color-success)]/15 text-[var(--color-success)]"
                          : "border-[var(--color-border)]/70 bg-white/5 text-[var(--color-muted)] hover:border-[var(--color-accent)]/40 hover:text-foreground",
                        isPending && "opacity-60"
                      )}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Set ${setNumber}`}
                    </button>
                  );
                })}
              </div>

              {exercise.notes && (
                <details className="rounded-2xl border border-[var(--color-border)]/50 bg-black/20 p-3 text-sm text-[var(--color-muted)]">
                  <summary className="cursor-pointer list-none font-medium text-foreground">Exercise note</summary>
                  <p className="mt-2">{exercise.notes}</p>
                </details>
              )}
            </Card>
          );
        })}
      </div>

      {error && (
        <Card className="border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-sm text-[var(--color-danger)]">
          {error}
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Finish the session once you’ve completed what you realistically got through today. The app will save progress either way.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" asChild>
            <Link href="/workouts">Leave session</Link>
          </Button>
          <Button onClick={completeWorkout} disabled={finishing}>
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Finish workout
          </Button>
        </div>
      </div>
    </div>
  );
}
