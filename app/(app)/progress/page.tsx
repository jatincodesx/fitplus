import { redirect } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { WeightLogForm } from "@/components/progress/weight-log-form";
import { requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDisplayDate } from "@/lib/utils";

export default async function ProgressPage() {
  const sessionUser = await requireCustomerAppAccess();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      weightLogs: { orderBy: { date: "asc" } },
      workoutSessions: { orderBy: { startedAt: "desc" }, take: 14 },
      workoutLogs: { orderBy: { performedAt: "desc" }, take: 14 },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const weightSeries =
    user.weightLogs.length > 0
      ? user.weightLogs.map((entry) => ({ label: formatDisplayDate(entry.date), value: entry.weightKg }))
      : [
          { label: "Week 1", value: 82 },
          { label: "Week 2", value: 81.6 },
          { label: "Week 3", value: 81.2 },
          { label: "Week 4", value: 80.9 },
        ];

  const sessionHistory =
    user.workoutSessions.length > 0
      ? user.workoutSessions
      : user.workoutLogs.map((log) => ({
          id: log.id,
          status: log.completed ? "COMPLETED" : "ACTIVE",
        }));

  const completedCount = sessionHistory.filter((entry) => entry.status === "COMPLETED").length;
  const adherence = sessionHistory.length ? Math.round((completedCount / sessionHistory.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Progress</p>
        <h1 className="text-3xl font-semibold">See the trend, not just the day</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Weight trend" description="Stay inside your glide path" />
          <LineChart data={weightSeries} color="#22d3ee" />
        </Card>
        <Card>
          <CardHeader title="Log weight" description="Micro feedback, macro trend" />
          <WeightLogForm />
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Adherence over your latest 14 workout entries:{" "}
            <span className="font-semibold text-foreground">{adherence}%</span>
          </p>
        </Card>
      </div>
    </div>
  );
}
