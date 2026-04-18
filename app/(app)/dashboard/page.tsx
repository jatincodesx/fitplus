import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Flame, Trophy, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { LineChart } from "@/components/charts/line-chart";
import { requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCompleteUserFitnessContext } from "@/lib/coach-context";
import { getWorkoutPlanProgress } from "@/lib/workout-progress";
import { formatDisplayDate } from "@/lib/utils";

export default async function DashboardPage() {
  const sessionUser = await requireCustomerAppAccess();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      goals: { orderBy: { updatedAt: "desc" }, take: 1 },
      nutritionPlans: { orderBy: { createdAt: "desc" }, take: 1 },
      weightLogs: { orderBy: { date: "asc" } },
      chatMessages: { orderBy: { createdAt: "desc" }, take: 4 },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const context = await buildCompleteUserFitnessContext(user.id);
  const workoutProgress = await getWorkoutPlanProgress(user.id);
  const latestNutrition = user.nutritionPlans[0];
  const goal = user.goals[0];
  const weightSeries =
    user.weightLogs.length > 0
      ? user.weightLogs.map((entry) => ({ label: formatDisplayDate(entry.date), value: entry.weightKg }))
      : [
          { label: "Week 1", value: 82.4 },
          { label: "Week 2", value: 82.0 },
          { label: "Week 3", value: 81.6 },
          { label: "Week 4", value: 81.2 },
        ];

  const recentMessages = [...user.chatMessages].reverse();
  const nextWorkout = workoutProgress.nextWorkout;
  const coachInsight = workoutProgress.plan?.summary ?? context.quickInsight;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.12),rgba(34,211,238,0.08),rgba(5,6,10,0.98))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Overview</p>
            <h1 className="text-3xl font-semibold">Your performance cockpit</h1>
            <p className="max-w-3xl text-sm text-[var(--color-muted)]">{coachInsight}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>{workoutProgress.plan?.split ?? "Plan ready"}</Badge>
              <Badge variant="warning">
                {workoutProgress.completedDays}/{workoutProgress.totalDays || 0} sessions complete this week
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={nextWorkout ? `/workouts/${nextWorkout.id}` : "/workouts"}>
                {nextWorkout?.status === "in_progress" ? "Resume today’s workout" : "Start today’s workout"}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/coach-call">Coach Chat Session</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Current goal"
          value={goal?.type ?? context.profile.goalType ?? "Lean + strong"}
          subtext={goal?.notes ?? "Aligned to your latest onboarding"}
          icon={Trophy}
        />
        <StatCard
          title="Today’s workout"
          value={nextWorkout?.name ?? "Recovery"}
          subtext={nextWorkout?.focus ?? "No pending workout day"}
          icon={Activity}
          color="accent"
        />
        <StatCard
          title="Weekly completion"
          value={`${workoutProgress.weeklyCompletionPercent}%`}
          subtext={`${workoutProgress.completedDays}/${workoutProgress.totalDays || 0} workout days`}
          icon={Flame}
          color="warning"
        />
        <StatCard
          title="Calories target"
          value={`${latestNutrition?.calories ?? 2300} kcal`}
          subtext={`${latestNutrition?.protein ?? 170}p / ${latestNutrition?.carbs ?? 220}c / ${latestNutrition?.fat ?? 70}f`}
          icon={UtensilsCrossed}
          color="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Weight trend" description="Stay inside the glide path, not just the day-to-day noise" />
          <LineChart data={weightSeries} color="#22d3ee" />
        </Card>
        <Card className="space-y-4">
          <CardHeader title="AI coach insight" description="What the system is prioritizing right now" />
          <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-sm text-[var(--color-muted)]">
            <p className="text-base text-foreground">{context.quickInsight}</p>
          </div>
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p>
              Recent weight trend:{" "}
              <span className="font-semibold text-foreground">
                {context.recentWeightTrend.delta !== undefined
                  ? `${context.recentWeightTrend.delta > 0 ? "+" : ""}${context.recentWeightTrend.delta} kg`
                  : "Not enough data"}
              </span>
            </p>
            <p>
              Session consistency:{" "}
              <span className="font-semibold text-foreground">
                {context.recentWorkoutProgress.completionRateLast14Days}%
              </span>{" "}
              over the last 14 days
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4">
          <CardHeader
            title="Weekly training split"
            description={workoutProgress.plan?.title ?? "No active workout plan"}
          />
          {workoutProgress.plan ? (
            <div className="space-y-3">
              {workoutProgress.plan.days.map((day) => (
                <div
                  key={day.id}
                  className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {day.status === "completed" ? (
                          <Badge variant="success">Completed</Badge>
                        ) : day.status === "in_progress" ? (
                          <Badge>In progress</Badge>
                        ) : (
                          <Badge variant="warning">Ready</Badge>
                        )}
                        {day.dayOfWeek && <Badge>{day.dayOfWeek}</Badge>}
                      </div>
                      <p className="mt-2 text-base font-semibold">{day.name}</p>
                      <p className="text-sm text-[var(--color-muted)]">{day.focus}</p>
                    </div>
                    <Button variant="secondary" asChild>
                      <Link href={`/workouts/${day.id}`}>
                        {day.status === "in_progress" ? "Resume" : "Open"}
                      </Link>
                    </Button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-accent-2),var(--color-success))]"
                      style={{ width: `${day.completionPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {day.completedExercises}/{day.totalExercises} exercises complete
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Generate your first workout plan to see a structured weekly split here.
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Fuel target" description="Nutrition guidance connected to the current plan" />
            {latestNutrition ? (
              <div className="space-y-2 text-sm text-[var(--color-muted)]">
                <p className="text-base font-semibold text-foreground">
                  {latestNutrition.calories} kcal · {latestNutrition.protein}p / {latestNutrition.carbs}c / {latestNutrition.fat}f
                </p>
                <p>{latestNutrition.guidance ?? "Keep protein high, place carbs around training, and repeat easy meals."}</p>
                <Button variant="secondary" asChild>
                  <Link href="/nutrition">Open nutrition</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[var(--color-muted)]">
                <p>No nutrition target yet. Generate one from Nutrition or after a coach session.</p>
                <Button variant="secondary" asChild>
                  <Link href="/nutrition">Open nutrition</Link>
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent coach chat" description="Most recent messages" />
            <div className="space-y-3 text-sm">
              {recentMessages.length ? (
                recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                      {message.role === "ASSISTANT" ? "Coach" : "You"}
                    </p>
                    <p className="mt-1 text-[var(--color-muted)]">{message.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-[var(--color-muted)]">
                  Ask the AI coach for swaps, progression tweaks, or recovery advice to see the feed here.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Connected coaching</p>
          <p className="mt-1 text-lg font-semibold">Coach chat, workouts, nutrition, and progress now share the same athlete context.</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/coach">Open AI coach</Link>
        </Button>
      </Card>
    </div>
  );
}
