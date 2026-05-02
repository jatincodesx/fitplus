import { Card, CardHeader } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { WeightLogForm } from "@/components/progress/weight-log-form";
import { requireCustomerAppAccess } from "@/lib/auth";
import { getProgressPageData } from "@/lib/progress-data";

export default async function ProgressPage() {
  const sessionUser = await requireCustomerAppAccess();
  let loadFailed = false;
  let weightSeries: Awaited<ReturnType<typeof getProgressPageData>>["weightSeries"] = [];
  let adherence = 0;
  let hasWeightLogs = false;
  let hasWorkoutHistory = false;

  try {
    const data = await getProgressPageData(sessionUser.id);
    weightSeries = data.weightSeries;
    adherence = data.adherence;
    hasWeightLogs = data.hasWeightLogs;
    hasWorkoutHistory = data.hasWorkoutHistory;
  } catch (error) {
    loadFailed = true;
    console.error("[progress-page-error]", {
      label: "progress-page-data",
      error: error instanceof Error ? error.message : "UnknownError",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Progress</p>
        <h1 className="text-3xl font-semibold">See the trend, not just the day</h1>
      </div>

      {loadFailed ? (
        <Card className="border-amber-400/30 bg-amber-500/10">
          <CardHeader title="Progress data could not load" description="The page stayed responsive, but the history queries failed." />
          <p className="text-sm text-amber-100">
            Refresh this page to retry. If it still fails, the Worker database path is still unstable.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Weight trend" description="Stay inside your glide path" />
          {loadFailed ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-6 text-center text-sm text-[var(--color-muted)]">
              Weight history is temporarily unavailable.
            </div>
          ) : hasWeightLogs ? (
            <LineChart data={weightSeries} color="#22d3ee" />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-6 text-center text-sm text-[var(--color-muted)]">
              No weight logs yet. Add your first weigh-in to start the trend view.
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Log weight" description="Micro feedback, macro trend" />
          <WeightLogForm />
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            {loadFailed
              ? "Workout adherence is temporarily unavailable."
              : hasWorkoutHistory
                ? "Adherence over your latest 14 workout entries:"
                : "No recent workout history yet."}{" "}
            {!loadFailed ? <span className="font-semibold text-foreground">{adherence}%</span> : null}
          </p>
        </Card>
      </div>
    </div>
  );
}
