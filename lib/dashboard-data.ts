import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

const DASHBOARD_QUERY_TIMEOUT_MS = Number(process.env.DASHBOARD_QUERY_TIMEOUT_MS ?? 15000);

function logDashboardData(event: string, metadata?: Record<string, unknown>) {
  if (process.env.AUTH_DEBUG !== "true") {
    return;
  }

  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[dashboard-data] ${event}${payload}`);
}

function logDashboardError(event: string, metadata?: Record<string, unknown>) {
  const context = metadata ? metadata : {};
  console.error("[dashboard-data-error]", {
    event,
    ...context,
  });
}

async function withDashboardTimeout<T>(label: string, task: () => Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`DashboardTimeout:${label}`)), DASHBOARD_QUERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([task(), timeout]);
  } catch (error) {
    logDashboardError("step-failed", {
      label,
      error: error instanceof Error ? error.message : "UnknownError",
    });
    logDashboardData("step-failed", {
      label,
      error: error instanceof Error ? error.message : "UnknownError",
    });
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

type DashboardWorkoutDay = {
  id: string;
  name: string;
  dayOfWeek?: string | null;
  focus?: string | null;
  status: "not_started" | "in_progress" | "completed";
  completionPercent: number;
  completedExercises: number;
  totalExercises: number;
};

type DashboardWorkoutProgress = {
  plan: {
    id: string;
    title: string;
    split?: string | null;
    summary?: string | null;
    days: DashboardWorkoutDay[];
  } | null;
  weeklyCompletionPercent: number;
  completedDays: number;
  totalDays: number;
  nextWorkout?: DashboardWorkoutDay;
};

async function getDashboardWorkoutProgress(userId: string): Promise<DashboardWorkoutProgress> {
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { exercises: true } },
          sessions: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              status: true,
              completionPercent: true,
              completedExercises: true,
              totalExercises: true,
            },
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

  const days: DashboardWorkoutDay[] = plan.days.map((day) => {
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
      status,
      completionPercent: latestSession?.completionPercent ?? 0,
      completedExercises: latestSession?.completedExercises ?? 0,
      totalExercises: latestSession?.totalExercises ?? day._count.exercises,
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

export const getDashboardRenderData = cache(async (userId: string) => {
  logDashboardData("render-data-start", { userId });

  logDashboardData("user-base-query-start", { userId });
  const baseUser = await withDashboardTimeout("user-base-query", () =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: {
          select: {
            goalType: true,
            currentGoal: true,
          },
        },
      },
    })
  );
  logDashboardData("user-base-query-done", { userId, found: Boolean(baseUser) });

  if (!baseUser) {
    return {
      user: null,
      workoutProgress: {
        plan: null,
        weeklyCompletionPercent: 0,
        completedDays: 0,
        totalDays: 0,
        nextWorkout: undefined,
      } satisfies DashboardWorkoutProgress,
    };
  }

  const withDashboardFallback = async <T>(
    label: string,
    task: () => Promise<T>,
    fallback: T
  ): Promise<T> => {
    try {
      return await withDashboardTimeout(label, task);
    } catch (error) {
      logDashboardData(`${label}-fallback`, {
        userId,
        error: error instanceof Error ? error.message : "UnknownError",
      });
      return fallback;
    }
  };

  logDashboardData("goals-query-start", { userId });
  const goals = await withDashboardFallback(
    "goals-query",
    () =>
      prisma.goal.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          type: true,
          notes: true,
        },
      }),
    []
  );
  logDashboardData("goals-query-done", { userId, count: goals.length });

  logDashboardData("nutrition-plan-query-start", { userId });
  const nutritionPlans = await withDashboardFallback(
    "nutrition-plan-query",
    () =>
      prisma.nutritionPlan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          guidance: true,
        },
      }),
    []
  );
  logDashboardData("nutrition-plan-query-done", { userId, count: nutritionPlans.length });

  logDashboardData("weight-logs-query-start", { userId });
  const weightLogs = await withDashboardFallback(
    "weight-logs-query",
    () =>
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 120,
        select: {
          date: true,
          weightKg: true,
        },
      }),
    []
  );
  logDashboardData("weight-logs-query-done", { userId, count: weightLogs.length });

  logDashboardData("chat-messages-query-start", { userId });
  const chatMessages = await withDashboardFallback(
    "chat-messages-query",
    () =>
      prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          role: true,
          content: true,
        },
      }),
    []
  );
  logDashboardData("chat-messages-query-done", { userId, count: chatMessages.length });

  logDashboardData("workout-sessions-query-start", { userId });
  const workoutSessions = await withDashboardFallback(
    "workout-sessions-query",
    () =>
      prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          status: true,
        },
      }),
    []
  );
  logDashboardData("workout-sessions-query-done", { userId, count: workoutSessions.length });

  logDashboardData("workout-progress-start", { userId });
  const workoutProgress = await withDashboardFallback("workout-progress", () => getDashboardWorkoutProgress(userId), {
    plan: null,
    weeklyCompletionPercent: 0,
    completedDays: 0,
    totalDays: 0,
    nextWorkout: undefined,
  } satisfies DashboardWorkoutProgress);
  if (!workoutProgress.plan) {
    logDashboardData("workout-progress-fallback", {
      userId,
      hasPlan: false,
    });
  }
  logDashboardData("workout-progress-done", { userId, hasPlan: Boolean(workoutProgress.plan) });

  logDashboardData("render-data-done", {
    userId,
    found: Boolean(baseUser),
    hasPlan: Boolean(workoutProgress.plan),
  });

  return {
    user: {
      ...baseUser,
      goals,
      nutritionPlans,
      weightLogs,
      chatMessages,
      workoutSessions,
    },
    workoutProgress,
  };
});
