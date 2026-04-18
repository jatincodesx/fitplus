import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GeneratePlanButton } from "@/components/workouts/generate-plan-button";
import { WorkoutDayCard } from "@/components/workouts/workout-day-card";
import { requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkoutPlanProgress } from "@/lib/workout-progress";
import { Dumbbell, Sparkles } from "lucide-react";

export default async function WorkoutsPage() {
  const sessionUser = await requireCustomerAppAccess();
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    redirect("/sign-in");
  }

  const workoutProgress = await getWorkoutPlanProgress(user.id);

  if (!workoutProgress.plan) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Planner</p>
            <h1 className="text-3xl font-semibold">Workout planner</h1>
            <p className="text-sm text-[var(--color-muted)]">
              Generate a premium weekly plan that connects your AI coach, schedule, and current constraints.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GeneratePlanButton />
            <Button variant="secondary" asChild>
              <Link href="/coach-call">Coach Chat Session</Link>
            </Button>
          </div>
        </div>

        <Card className="space-y-4 border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-[var(--color-accent)]/15 p-3 text-[var(--color-accent)]">
              <Dumbbell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">No workout week yet</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
                Generate a structured weekly block from your current profile, or run a coach session if you want the AI to capture fresh context first.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Planner</p>
          <h1 className="text-3xl font-semibold">Weekly training plan</h1>
          <p className="text-sm text-[var(--color-muted)]">
            A structured week with live execution, saved completion state, and coach-driven rationale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GeneratePlanButton />
          <Button variant="secondary" asChild>
            <Link href="/coach-call">Coach Chat Session</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-5 overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.1),rgba(34,211,238,0.08),rgba(5,6,10,0.95))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)]/70 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-2)]" />
              {workoutProgress.plan.split || "Structured weekly split"}
            </div>
            <h2 className="text-3xl font-semibold">{workoutProgress.plan.title}</h2>
            <p className="max-w-3xl text-sm text-[var(--color-muted)]">
              {workoutProgress.plan.summary}
            </p>
          </div>

          <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Weekly completion</p>
              <p className="mt-2 text-2xl font-semibold">{workoutProgress.weeklyCompletionPercent}%</p>
              <p className="text-xs text-[var(--color-muted)]">
                {workoutProgress.completedDays}/{workoutProgress.totalDays} days complete
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Next workout</p>
              <p className="mt-2 text-lg font-semibold">{workoutProgress.nextWorkout?.name ?? "Week complete"}</p>
              <p className="text-xs text-[var(--color-muted)]">{workoutProgress.nextWorkout?.focus ?? "Recover well"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <span>Plan progress</span>
            <span>{workoutProgress.completedDays}/{workoutProgress.totalDays} complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-accent-2),var(--color-success))] transition-[width] duration-500"
              style={{ width: `${workoutProgress.weeklyCompletionPercent}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-5">
        {workoutProgress.plan.days.map((day, index) => (
          <WorkoutDayCard key={day.id} day={day} emphasize={index === 0} />
        ))}
      </div>
    </div>
  );
}
