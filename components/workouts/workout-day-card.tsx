import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkoutDayProgress } from "@/lib/workout-progress";
import { CheckCircle2, Circle, PlayCircle, RotateCcw } from "lucide-react";

export function WorkoutDayCard({
  day,
  emphasize = false,
}: {
  day: WorkoutDayProgress;
  emphasize?: boolean;
}) {
  const statusMeta =
    day.status === "completed"
      ? {
          label: "Completed",
          badge: <Badge variant="success">Completed</Badge>,
          actionLabel: "View result",
          icon: <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />,
        }
      : day.status === "in_progress"
        ? {
            label: "In progress",
            badge: <Badge>In progress</Badge>,
            actionLabel: "Resume workout",
            icon: <RotateCcw className="h-4 w-4 text-[var(--color-accent)]" />,
          }
        : {
            label: "Not started",
            badge: <Badge>Ready</Badge>,
            actionLabel: "Start workout",
            icon: <PlayCircle className="h-4 w-4 text-[var(--color-accent)]" />,
          };

  return (
    <Card
      className={cn(
        "space-y-4 border transition-all duration-200",
        day.status === "completed" && "border-[var(--color-success)]/25 bg-[var(--color-success)]/7",
        day.status === "in_progress" && "border-[var(--color-accent)]/25 bg-[var(--color-accent)]/7",
        emphasize && "shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {statusMeta.badge}
            {day.dayOfWeek && (
              <span className="rounded-full border border-[var(--color-border)]/70 px-2.5 py-1 text-xs text-[var(--color-muted)]">
                {day.dayOfWeek}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{day.name}</h3>
            <p className="text-sm text-[var(--color-muted)]">{day.focus}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Progress</p>
            <p className="mt-1 text-lg font-semibold">{day.completionPercent}%</p>
          </div>
          <Button asChild>
            <Link href={`/workouts/${day.id}`}>{statusMeta.actionLabel}</Link>
          </Button>
        </div>
      </div>

      {day.rationale && (
        <p className="text-sm text-[var(--color-muted)]">{day.rationale}</p>
      )}

      <div className="h-2 overflow-hidden rounded-full bg-white/6">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-accent-2),var(--color-success))] transition-[width] duration-500"
          style={{ width: `${day.completionPercent}%` }}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {day.exercises.map((exercise) => (
          <div
            key={exercise.id}
            className={cn(
              "flex items-start gap-3 rounded-2xl border border-[var(--color-border)]/60 px-3 py-3",
              exercise.isCompleted && "border-[var(--color-success)]/20 bg-[var(--color-success)]/7"
            )}
          >
            <span className="mt-0.5">
              {exercise.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <Circle className="h-4 w-4 text-[var(--color-muted)]" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{exercise.name}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {exercise.sets} x {exercise.reps} · {exercise.muscleGroup}
                {exercise.restSeconds ? ` · ${exercise.restSeconds}s rest` : ""}
              </p>
              {exercise.notes && <p className="mt-1 text-xs text-[var(--color-muted)]">{exercise.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
        <span>
          {day.completedExercises}/{day.totalExercises} exercises marked complete
        </span>
        <span className="inline-flex items-center gap-2">
          {statusMeta.icon}
          {statusMeta.label}
        </span>
      </div>
    </Card>
  );
}
