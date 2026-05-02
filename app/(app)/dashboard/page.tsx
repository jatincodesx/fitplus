import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Flame, Trophy, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { LineChart } from "@/components/charts/line-chart";
import { requireCustomerAppAccess } from "@/lib/auth";
import { getDashboardRenderData } from "@/lib/dashboard-data";
import { formatDisplayDate } from "@/lib/utils";

function logDashboardPage(event: string, metadata?: Record<string, unknown>) {
  if (process.env.AUTH_DEBUG !== "true") {
    return;
  }

  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[dashboard-page] ${event}${payload}`);
}

export default async function DashboardPage() {
  logDashboardPage("start");
  const sessionUser = await requireCustomerAppAccess();
  logDashboardPage("session-user", { userId: sessionUser.id, role: sessionUser.role });

  logDashboardPage("render-data-start", { userId: sessionUser.id });
  const { user, workoutProgress } = await getDashboardRenderData(sessionUser.id);
  logDashboardPage("render-data-done", {
    userId: sessionUser.id,
    found: Boolean(user),
    hasPlan: Boolean(workoutProgress.plan),
  });

  if (!user) {
    redirect("/sign-in");
  }

  const latestNutrition = user.nutritionPlans[0];
  const goal = user.goals[0];
  const weightLogs = [...user.weightLogs].reverse();
  const recentSessions = user.workoutSessions;
  const completedRecentSessions = recentSessions.filter((session) => session.status === "COMPLETED");
  const completionRateLast14Days = recentSessions.length
    ? Math.round((completedRecentSessions.length / recentSessions.length) * 100)
    : 0;
  const oldestWeight = weightLogs[0]?.weightKg;
  const latestWeight = weightLogs.at(-1)?.weightKg;
  const weightDelta =
    oldestWeight !== undefined && latestWeight !== undefined
      ? Math.round((latestWeight - oldestWeight) * 10) / 10
      : undefined;
  const quickInsight =
    workoutProgress.plan?.summary ??
    (completionRateLast14Days >= 80
      ? `Coach priority this week: keep the current rhythm and use your ${latestNutrition?.calories ?? 2300} kcal target to support recovery.`
      : goal?.type
        ? `Coach priority this week: tighten execution around your ${goal.type.toLowerCase()} goal and avoid skipping the main lifts.`
        : "Coach priority this week: stay consistent, hit the main lifts with intent, and keep recovery habits simple.");

  const weightSeries =
    weightLogs.length > 0
      ? weightLogs.map((entry) => ({ label: formatDisplayDate(entry.date), value: entry.weightKg }))
      : [
          { label: "Week 1", value: 82.4 },
          { label: "Week 2", value: 82.0 },
          { label: "Week 3", value: 81.6 },
          { label: "Week 4", value: 81.2 },
        ];

  const recentMessages = [...user.chatMessages].reverse();
  const nextWorkout = workoutProgress.nextWorkout;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.12),rgba(34,211,238,0.08),rgba(5,6,10,0.98))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Overview</p>
            <h1 className="text-3xl font-semibold">Your performance cockpit</h1>
            <p className="max-w-3xl text-sm text-[var(--color-muted)]">{quickInsight}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>{workoutProgress.plan?.split ?? "Plan ready"}</Badge>
              <Badge variant="warning">
                {workoutProgress.completedDays}/{workoutProgress.totalDays || 0} sessions complete this week
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={nextWorkout ? `/workouts/${nextWorkout.id}` : "/workouts"} prefetch={false}>
                {nextWorkout?.status === "in_progress" ? "Resume today’s workout" : "Start today’s workout"}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/coach-call" prefetch={false}>Coach Chat Session</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Current goal"
          value={goal?.type ?? user.profile?.goalType ?? "Lean + strong"}
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
            <p className="text-base text-foreground">{quickInsight}</p>
          </div>
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p>
              Recent weight trend:{" "}
              <span className="font-semibold text-foreground">
                {weightDelta !== undefined
                  ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg`
                  : "Not enough data"}
              </span>
            </p>
            <p>
              Session consistency:{" "}
              <span className="font-semibold text-foreground">
                {completionRateLast14Days}%
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
                      <Link href={`/workouts/${day.id}`} prefetch={false}>
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
                  <Link href="/nutrition" prefetch={false}>Open nutrition</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[var(--color-muted)]">
                <p>No nutrition target yet. Generate one from Nutrition or after a coach session.</p>
                <Button variant="secondary" asChild>
                  <Link href="/nutrition" prefetch={false}>Open nutrition</Link>
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
          <Link href="/coach" prefetch={false}>Open AI coach</Link>
        </Button>
      </Card>
    </div>
  );
}
