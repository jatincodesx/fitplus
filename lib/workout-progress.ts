import type { Prisma, WorkoutSession } from "@prisma/client";
import { prisma } from "./prisma";

type SessionWithExercises = Prisma.WorkoutSessionGetPayload<{
  include: { exercises: { orderBy: { order: "asc" } }; workoutDay: true };
}>;

export type WorkoutSessionClientPayload = {
  id: string;
  workoutDayId?: string;
  dayName: string;
  dayFocus?: string | null;
  status: string;
  completionPercent: number;
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
  startedAt: string;
  completedAt?: string | null;
  coachFeedback?: string | null;
  exercises: {
    id: string;
    name: string;
    muscleGroup: string;
    setsTarget: number;
    repsTarget: number;
    restSeconds?: number | null;
    notes?: string | null;
    order: number;
    completedSets: number;
    isCompleted: boolean;
  }[];
};

export type WorkoutDayProgress = {
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
    isCompleted: boolean;
    completedSets: number;
  }[];
  latestSession?: WorkoutSessionClientPayload;
  status: "not_started" | "in_progress" | "completed";
  completionPercent: number;
  completedExercises: number;
  totalExercises: number;
};

export type WorkoutPlanProgress = {
  plan: {
    id: string;
    title: string;
    split?: string | null;
    summary?: string | null;
    days: WorkoutDayProgress[];
  } | null;
  weeklyCompletionPercent: number;
  completedDays: number;
  totalDays: number;
  nextWorkout?: WorkoutDayProgress;
};

function serializeSession(session: SessionWithExercises): WorkoutSessionClientPayload {
  return {
    id: session.id,
    workoutDayId: session.workoutDayId ?? undefined,
    dayName: session.dayName,
    dayFocus: session.dayFocus,
    status: session.status,
    completionPercent: session.completionPercent,
    totalExercises: session.totalExercises,
    completedExercises: session.completedExercises,
    totalSets: session.totalSets,
    completedSets: session.completedSets,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    coachFeedback: session.coachFeedback,
    exercises: session.exercises.map((exercise) => ({
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
  };
}

function buildCoachFeedback(session: Pick<WorkoutSession, "completionPercent" | "completedExercises" | "totalExercises"> & {
  dayName: string;
}) {
  if (session.completionPercent >= 100) {
    return `Strong session. You finished ${session.dayName} exactly as planned, which is how weeks start compounding instead of stalling.`;
  }

  if (session.completionPercent >= 70) {
    return `Solid work. You got the important parts of ${session.dayName} done, so recover well and pick up the remaining volume next time.`;
  }

  return `You still banked progress on ${session.dayName}. The next win is simply returning with a cleaner, fuller session instead of chasing perfection today.`;
}

async function recalculateSession(
  tx: Prisma.TransactionClient,
  sessionId: string
) {
  const session = await tx.workoutSession.findUnique({
    where: { id: sessionId },
    include: { exercises: { orderBy: { order: "asc" } }, workoutDay: true },
  });

  if (!session) {
    throw new Error("Workout session not found.");
  }

  const totalExercises = session.exercises.length;
  const completedExercises = session.exercises.filter(
    (exercise) => exercise.isCompleted || exercise.completedSets >= exercise.setsTarget
  ).length;
  const totalSets = session.exercises.reduce((sum, exercise) => sum + exercise.setsTarget, 0);
  const completedSets = session.exercises.reduce(
    (sum, exercise) => sum + Math.min(exercise.completedSets, exercise.setsTarget),
    0
  );
  const completionPercent = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  const updated = await tx.workoutSession.update({
    where: { id: sessionId },
    data: {
      totalExercises,
      completedExercises,
      totalSets,
      completedSets,
      completionPercent,
    },
    include: { exercises: { orderBy: { order: "asc" } }, workoutDay: true },
  });

  return updated;
}

export async function getWorkoutPlanProgress(userId: string): Promise<WorkoutPlanProgress> {
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          exercises: { orderBy: { order: "asc" } },
          sessions: {
            orderBy: { startedAt: "desc" },
            take: 1,
            include: { exercises: { orderBy: { order: "asc" } }, workoutDay: true },
          },
        },
      },
    },
  });

  if (!plan) {
    return {
      plan: null,
      weeklyCompletionPercent: 0,
      completedDays: 0,
      totalDays: 0,
    };
  }

  const days = plan.days.map<WorkoutDayProgress>((day) => {
    const latestSession = day.sessions[0];
    const status =
      latestSession?.status === "COMPLETED"
        ? "completed"
        : latestSession?.status === "ACTIVE"
          ? "in_progress"
          : "not_started";

    return {
      id: day.id,
      name: day.name,
      dayOfWeek: day.dayOfWeek,
      focus: day.focus,
      rationale: day.rationale,
      coachTip: day.coachTip,
      targetDurationMins: day.targetDurationMins,
      exercises: day.exercises.map((exercise, index) => {
        const sessionExercise = latestSession?.exercises[index];
        return {
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
          isCompleted: sessionExercise?.isCompleted ?? false,
          completedSets: sessionExercise?.completedSets ?? 0,
        };
      }),
      latestSession: latestSession ? serializeSession(latestSession) : undefined,
      status,
      completionPercent: latestSession?.completionPercent ?? 0,
      completedExercises: latestSession?.completedExercises ?? 0,
      totalExercises: latestSession?.totalExercises ?? day.exercises.length,
    };
  });

  const completedDays = days.filter((day) => day.status === "completed").length;
  const totalDays = days.length;
  const weeklyCompletionPercent = totalDays ? Math.round((completedDays / totalDays) * 100) : 0;
  const nextWorkout = days.find((day) => day.status !== "completed") ?? days[0];

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      split: plan.split,
      summary: plan.summary,
      days,
    },
    weeklyCompletionPercent,
    completedDays,
    totalDays,
    nextWorkout,
  };
}

export async function createOrResumeWorkoutSession(
  userId: string,
  workoutDayId: string,
  options?: { forceNew?: boolean }
) {
  const day = await prisma.workoutDay.findFirst({
    where: { id: workoutDayId, workoutPlan: { userId } },
    include: {
      workoutPlan: true,
      exercises: { orderBy: { order: "asc" } },
    },
  });

  if (!day) {
    throw new Error("Workout day not found.");
  }

  if (!options?.forceNew) {
    const activeSession = await prisma.workoutSession.findFirst({
      where: {
        userId,
        workoutDayId: day.id,
        status: "ACTIVE",
      },
      orderBy: { startedAt: "desc" },
      include: { exercises: { orderBy: { order: "asc" } }, workoutDay: true },
    });

    if (activeSession) {
      return serializeSession(activeSession);
    }
  }

  const totalSets = day.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      workoutPlanId: day.workoutPlanId,
      workoutDayId: day.id,
      status: "ACTIVE",
      planTitle: day.workoutPlan.title,
      dayName: day.name,
      dayFocus: day.focus,
      totalExercises: day.exercises.length,
      totalSets,
      exercises: {
        create: day.exercises.map((exercise) => ({
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          setsTarget: exercise.sets,
          repsTarget: exercise.reps,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
          order: exercise.order,
        })),
      },
    },
    include: { exercises: { orderBy: { order: "asc" } }, workoutDay: true },
  });

  return serializeSession(session);
}

export async function updateWorkoutSessionExercise(
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  completedSets: number
) {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, status: true },
  });

  if (!session) {
    throw new Error("Workout session not found.");
  }

  if (session.status !== "ACTIVE") {
    throw new Error("Only active workout sessions can be updated.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const existingExercise = await tx.workoutSessionExercise.findFirst({
      where: { id: sessionExerciseId, sessionId },
    });

    if (!existingExercise) {
      throw new Error("Workout exercise not found.");
    }

    const clamped = Math.max(0, Math.min(existingExercise.setsTarget, Math.round(completedSets)));

    await tx.workoutSessionExercise.update({
      where: { id: sessionExerciseId },
      data: {
        completedSets: clamped,
        isCompleted: clamped >= existingExercise.setsTarget,
        completedAt: clamped >= existingExercise.setsTarget ? new Date() : null,
      },
    });

    return recalculateSession(tx, sessionId);
  });

  return serializeSession(updated);
}

export async function completeWorkoutSession(userId: string, sessionId: string) {
  const completed = await prisma.$transaction(async (tx) => {
    const session = await tx.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: { exercises: { orderBy: { order: "asc" } }, workoutDay: true },
    });

    if (!session) {
      throw new Error("Workout session not found.");
    }

    if (session.status === "COMPLETED") {
      return session;
    }

    const recalculated = await recalculateSession(tx, sessionId);
    const coachFeedback = buildCoachFeedback({
      completionPercent: recalculated.completionPercent,
      completedExercises: recalculated.completedExercises,
      totalExercises: recalculated.totalExercises,
      dayName: recalculated.dayName,
    });

    const finalized = await tx.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        coachFeedback,
      },
      include: { exercises: { orderBy: { order: "asc" } }, workoutDay: true },
    });

    await tx.workoutLog.create({
      data: {
        userId,
        workoutDayId: finalized.workoutDayId ?? undefined,
        completed: true,
        notes: `Completed ${finalized.completedExercises}/${finalized.totalExercises} exercises and ${finalized.completedSets}/${finalized.totalSets} sets during ${finalized.dayName}.`,
      },
    });

    return finalized;
  });

  return serializeSession(completed);
}
