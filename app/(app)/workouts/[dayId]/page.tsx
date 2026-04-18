import { redirect } from "next/navigation";
import { requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkoutSessionClient } from "@/components/workouts/workout-session-client";

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const sessionUser = await requireCustomerAppAccess();
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    redirect("/sign-in");
  }

  const day = await prisma.workoutDay.findFirst({
    where: {
      id: dayId,
      workoutPlan: { userId: user.id },
    },
    include: {
      exercises: { orderBy: { order: "asc" } },
      sessions: {
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!day) {
    redirect("/workouts");
  }

  const latestSession = day.sessions[0];
  const initialSession = latestSession
    ? {
        id: latestSession.id,
        workoutDayId: latestSession.workoutDayId ?? undefined,
        dayName: latestSession.dayName,
        dayFocus: latestSession.dayFocus,
        status: latestSession.status,
        completionPercent: latestSession.completionPercent,
        totalExercises: latestSession.totalExercises,
        completedExercises: latestSession.completedExercises,
        totalSets: latestSession.totalSets,
        completedSets: latestSession.completedSets,
        startedAt: latestSession.startedAt.toISOString(),
        completedAt: latestSession.completedAt?.toISOString() ?? null,
        coachFeedback: latestSession.coachFeedback,
        exercises: latestSession.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          setsTarget: exercise.setsTarget,
          repsTarget: exercise.repsTarget,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
          order: exercise.order,
          completedSets: exercise.completedSets,
          isCompleted: exercise.isCompleted,
        })),
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Workout Session</p>
        <h1 className="text-3xl font-semibold">Live execution</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Move through the workout in order, mark sets complete, and finish when you’re done.
        </p>
      </div>

      <WorkoutSessionClient
        day={{
          id: day.id,
          name: day.name,
          dayOfWeek: day.dayOfWeek,
          focus: day.focus,
          rationale: day.rationale,
          coachTip: day.coachTip,
          targetDurationMins: day.targetDurationMins,
          exercises: day.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: exercise.sets,
            reps: exercise.reps,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes,
          })),
        }}
        initialSession={initialSession}
      />
    </div>
  );
}
