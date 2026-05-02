import "server-only";

import { prisma } from "@/lib/prisma";

const PROFILE_QUERY_TIMEOUT_MS = Number(process.env.PROFILE_QUERY_TIMEOUT_MS ?? 15000);

function logProfileData(event: string, metadata?: Record<string, unknown>) {
  if (process.env.AUTH_DEBUG !== "true") {
    return;
  }

  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[profile-data] ${event}${payload}`);
}

function logProfileError(event: string, metadata?: Record<string, unknown>) {
  const context = metadata ? metadata : {};
  console.error("[profile-data-error]", {
    event,
    ...context,
  });
}

async function withProfileTimeout<T>(label: string, task: () => Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`ProfileTimeout:${label}`)), PROFILE_QUERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([task(), timeout]);
  } catch (error) {
    logProfileError("step-failed", {
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

async function getProfileWorkoutSummary(userId: string) {
  logProfileData("workout-summary-start", { userId });
  const plan = await withProfileTimeout("workout-summary", () =>
    prisma.workoutPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        split: true,
        summary: true,
        days: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            focus: true,
            sessions: {
              orderBy: { startedAt: "desc" },
              take: 1,
              select: {
                status: true,
              },
            },
          },
        },
      },
    })
  );

  if (!plan) {
    logProfileData("workout-summary-empty", { userId });
    return {
      plan: null,
      completedDays: 0,
      totalDays: 0,
      nextWorkout: null,
    };
  }

  const days = plan.days.map((day) => {
    const latestStatus = day.sessions[0]?.status;
    const status =
      latestStatus === "COMPLETED"
        ? "completed"
        : latestStatus === "ACTIVE"
          ? "in_progress"
          : "not_started";

    return {
      id: day.id,
      name: day.name,
      focus: day.focus,
      status,
    };
  });

  const completedDays = days.filter((day) => day.status === "completed").length;
  const totalDays = days.length;
  const nextWorkout = days.find((day) => day.status !== "completed") ?? days[0] ?? null;

  logProfileData("workout-summary-done", {
    userId,
    totalDays,
    completedDays,
    hasNextWorkout: Boolean(nextWorkout),
  });

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      split: plan.split,
      summary: plan.summary,
      days: days.slice(0, 3),
    },
    completedDays,
    totalDays,
    nextWorkout,
  };
}

type ProfileWorkoutSummary = Awaited<ReturnType<typeof getProfileWorkoutSummary>>;

export async function getProfileRenderData(userId: string) {
  logProfileData("render-start", { userId });

  const user = await withProfileTimeout("user-query", () =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        password: true,
        profile: {
          select: {
            currentGoal: true,
            goalType: true,
            experienceLevel: true,
            trainingDaysPerWeek: true,
            sessionDurationMins: true,
            trainingLocation: true,
            availableEquipment: true,
            injuries: true,
            dietaryPreference: true,
          },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
            planTier: true,
          },
        },
        accounts: {
          orderBy: { provider: "asc" },
          select: {
            id: true,
            provider: true,
            createdAt: true,
          },
        },
      },
    })
  );

  logProfileData("user-query-done", {
    userId,
    found: Boolean(user),
  });

  if (!user) {
    return {
      user: null,
      workoutSummary: {
        plan: null,
        completedDays: 0,
        totalDays: 0,
        nextWorkout: null,
      },
    };
  }

  let sessions: Array<{
    id: string;
    sessionToken: string;
    userAgent: string | null;
    ipAddress: string | null;
    updatedAt: Date;
    expires: Date;
  }> = [];

  try {
    logProfileData("sessions-query-start", { userId });
    sessions = await withProfileTimeout("sessions-query", () =>
      prisma.session.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          sessionToken: true,
          userAgent: true,
          ipAddress: true,
          updatedAt: true,
          expires: true,
        },
      })
    );
    logProfileData("sessions-query-done", {
      userId,
      count: sessions.length,
    });
  } catch (error) {
    logProfileData("sessions-query-fallback", {
      userId,
      error: error instanceof Error ? error.message : "UnknownError",
    });
  }

  let workoutSummary: ProfileWorkoutSummary = {
    plan: null,
    completedDays: 0,
    totalDays: 0,
    nextWorkout: null,
  };

  try {
    workoutSummary = await getProfileWorkoutSummary(userId);
  } catch (error) {
    logProfileData("workout-summary-fallback", {
      userId,
      error: error instanceof Error ? error.message : "UnknownError",
    });
  }

  logProfileData("render-done", {
    userId,
    found: Boolean(user),
    hasPlan: Boolean(workoutSummary.plan),
  });

  return {
    user: {
      ...user,
      sessions,
    },
    workoutSummary,
  };
}
