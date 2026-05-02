import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoachChat } from "@/components/coach/chat-panel";
import { requireCustomerAppAccess } from "@/lib/auth";
import { getCoachPageData } from "@/lib/coach-page-data";

export default async function CoachPage() {
  const sessionUser = await requireCustomerAppAccess();
  const coachPageData = await getCoachPageData(sessionUser.id).catch((error) => {
    console.error("[coach-page-error]", {
      label: "coach-page-data",
      error: error instanceof Error ? error.message : "UnknownError",
    });
    return null;
  });

  if (!coachPageData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">AI Coach</p>
            <h1 className="text-3xl font-semibold">Context-aware coaching</h1>
            <p className="text-sm text-[var(--color-muted)]">
              The coach page could not load its database context, so this route is showing an explicit error state.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/coach-call">Run a new coach session</Link>
          </Button>
        </div>

        <Card className="border-amber-400/30 bg-amber-500/10">
          <CardHeader title="Coach data is unavailable" description="Retry once the Worker database path is healthy again." />
          <p className="text-sm text-amber-100">
            This is not the same as “no messages” or “no plan”. The route data load itself failed.
          </p>
        </Card>
      </div>
    );
  }

  const { messages, context, workoutProgress } = coachPageData;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">AI Coach</p>
          <h1 className="text-3xl font-semibold">Context-aware coaching</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Ask for plan tweaks, substitutions, recovery adjustments, or nutrition changes that fit your live program.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/coach-call">Run a new coach session</Link>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="flex min-h-[640px] flex-col">
          <CardHeader title="Coach chat" description="Powered by your profile, plan, progress, and recent messages" />
          <CoachChat initialMessages={messages} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Current coach insight" />
            <p className="text-sm text-[var(--color-muted)]">{context.quickInsight}</p>
          </Card>

          <Card>
            <CardHeader title="Current training block" description={workoutProgress.plan?.split ?? "No active split"} />
            {workoutProgress.plan ? (
              <div className="space-y-3 text-sm text-[var(--color-muted)]">
                <p>{workoutProgress.plan.summary}</p>
                <div className="space-y-2">
                  {workoutProgress.plan.days.slice(0, 3).map((day) => (
                    <div key={day.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
                      <p className="font-semibold text-foreground">{day.name}</p>
                      <p>{day.focus}</p>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" asChild>
                  <Link href="/workouts">Open workouts</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Generate a workout plan or finish a coach session to connect training recommendations here.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent progress context" />
            <div className="space-y-2 text-sm text-[var(--color-muted)]">
              <p>
                Consistency last 14 days:{" "}
                <span className="font-semibold text-foreground">
                  {context.recentWorkoutProgress.completionRateLast14Days}%
                </span>
              </p>
              <p>
                Weight trend:{" "}
                <span className="font-semibold text-foreground">
                  {context.recentWeightTrend.delta !== undefined
                    ? `${context.recentWeightTrend.delta > 0 ? "+" : ""}${context.recentWeightTrend.delta} kg`
                    : "Not enough data"}
                </span>
              </p>
              <p>Missing context fields for sharper coaching: {context.missingFields.join(", ") || "None critical"}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
