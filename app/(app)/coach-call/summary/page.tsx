import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CoachCallSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;
  const sessionUser = await requireCustomerAppAccess();

  if (!sessionId) {
    redirect("/dashboard");
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    redirect("/sign-in");
  }

  const [call, workoutPlan, nutritionPlan] = await Promise.all([
    prisma.coachCallSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: { intake: true, planLog: true },
    }),
    prisma.workoutPlan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } } },
    }),
    prisma.nutritionPlan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!call) {
    redirect("/dashboard");
  }

  const intake = call.intake;
  const rationale = workoutPlan?.summary ?? call.summary ?? intake?.summary ?? "Your coach session has been processed and saved.";
  const firstDayId = workoutPlan?.days[0]?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Coach Session</p>
          <h1 className="text-3xl font-semibold">Session summary</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Your updated workout week and nutrition target are now connected to the rest of the app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={firstDayId ? `/workouts/${firstDayId}` : "/workouts"}>Start workout</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/nutrition">Open nutrition</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/coach-call">Chat again</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardHeader title="Coach rationale" description="Why this plan structure was chosen" />
          <p className="text-sm text-[var(--color-muted)]">{rationale}</p>
          {intake?.summary && (
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-sm text-[var(--color-muted)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Captured intake</p>
              <p className="mt-2 text-foreground">{intake.summary}</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Goals and constraints" />
          <div className="grid gap-2 text-sm text-[var(--color-muted)]">
            {intake?.goal && <p><span className="font-semibold text-foreground">Goal:</span> {intake.goal}</p>}
            {intake?.experience && <p><span className="font-semibold text-foreground">Experience:</span> {intake.experience}</p>}
            {intake?.daysPerWeek && <p><span className="font-semibold text-foreground">Days/week:</span> {intake.daysPerWeek}</p>}
            {intake?.sessionDuration && (
              <p><span className="font-semibold text-foreground">Session duration:</span> {intake.sessionDuration} min</p>
            )}
            {intake?.location && <p><span className="font-semibold text-foreground">Location:</span> {intake.location}</p>}
            {intake?.equipment && <p><span className="font-semibold text-foreground">Equipment:</span> {intake.equipment}</p>}
            {intake?.injuries && <p><span className="font-semibold text-foreground">Limitations:</span> {intake.injuries}</p>}
            {intake?.cardio && <p><span className="font-semibold text-foreground">Cardio:</span> {intake.cardio}</p>}
            {intake?.safetyNote && <p>{intake.safetyNote}</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Workout week" description={workoutPlan?.split ?? "Plan ready"} />
          {workoutPlan ? (
            <div className="space-y-3">
              {workoutPlan.days.map((day) => (
                <div key={day.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{day.name}</p>
                      <p className="text-sm text-[var(--color-muted)]">{day.focus}</p>
                    </div>
                    <Button variant="secondary" asChild>
                      <Link href={`/workouts/${day.id}`}>Open</Link>
                    </Button>
                  </div>
                  {day.coachTip && <p className="mt-3 text-xs text-[var(--color-muted)]">{day.coachTip}</p>}
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {day.exercises.slice(0, 4).map((exercise) => exercise.name).join(" · ")}
                    {day.exercises.length > 4 ? " ..." : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">No workout plan found.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Nutrition guidance" description={nutritionPlan ? "Generated" : "Pending"} />
          {nutritionPlan ? (
            <div className="space-y-3 text-sm text-[var(--color-muted)]">
              <p className="text-base font-semibold text-foreground">
                {nutritionPlan.calories} kcal · {nutritionPlan.protein}p / {nutritionPlan.carbs}c / {nutritionPlan.fat}f
              </p>
              <p>{nutritionPlan.guidance ?? "Use the target consistently and bias carbs around training."}</p>
              {nutritionPlan.sampleMeals && (
                <ul className="space-y-2">
                  {(() => {
                    try {
                      return (JSON.parse(nutritionPlan.sampleMeals) as { name: string; description: string }[])
                        .slice(0, 3)
                        .map((meal) => (
                          <li key={meal.name} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
                            <span className="font-semibold text-foreground">{meal.name}:</span> {meal.description}
                          </li>
                        ));
                    } catch {
                      return null;
                    }
                  })()}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Nutrition guidance will appear once generation finishes.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
