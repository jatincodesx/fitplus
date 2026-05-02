import "server-only";

import { prisma } from "@/lib/prisma";

const trackedFields = [
  "goal",
  "weight",
  "height",
  "age",
  "experience",
  "injuries",
  "daysPerWeek",
  "sessionDuration",
  "location",
  "equipment",
  "style",
  "cardio",
  "dislikes",
  "energySchedule",
  "dietaryPreference",
] as const;

type KnownFieldKey = (typeof trackedFields)[number];
type CoachKnownFields = Record<KnownFieldKey, string | number | undefined>;

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function roundToOneDecimal(value?: number) {
  if (value === undefined) {
    return undefined;
  }

  return Math.round(value * 10) / 10;
}

function buildQuickInsight(context: {
  injuries?: string;
  goal?: string;
  completionRateLast14Days: number;
  completedSessionsThisWeek: number;
  trainingDaysPerWeek?: number;
  nutritionCalories?: number;
}) {
  if (context.injuries) {
    return `Coach priority this week: keep load high enough to progress while respecting ${context.injuries.toLowerCase()}.`;
  }

  if (context.completedSessionsThisWeek === 0 && (context.trainingDaysPerWeek ?? 0) >= 3) {
    return "Coach priority this week: get the first high-quality session done early and let consistency build momentum.";
  }

  if (context.completionRateLast14Days >= 80) {
    return `Coach priority this week: keep the current rhythm and use your ${context.nutritionCalories ?? 2300} kcal target to support recovery.`;
  }

  if (context.goal) {
    return `Coach priority this week: tighten execution around your ${context.goal.toLowerCase()} goal and avoid skipping the main lifts.`;
  }

  return "Coach priority this week: stay consistent, hit the main lifts with intent, and keep recovery habits simple.";
}

export async function getCoachPageData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: {
          age: true,
          heightCm: true,
          weightKg: true,
          goalType: true,
          currentGoal: true,
          experienceLevel: true,
          trainingLocation: true,
          availableEquipment: true,
          injuries: true,
          trainingDaysPerWeek: true,
          sessionDurationMins: true,
          dietaryPreference: true,
        },
      },
      goals: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          type: true,
          notes: true,
          targetWeight: true,
        },
      },
      workoutPlans: {
        orderBy: { createdAt: "desc" },
        take: 1,
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
      },
      nutritionPlans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          guidance: true,
        },
      },
      weightLogs: {
        orderBy: { date: "desc" },
        take: 6,
        select: {
          date: true,
          weightKg: true,
        },
      },
      workoutSessions: {
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          status: true,
          startedAt: true,
          workoutDay: {
            select: {
              name: true,
            },
          },
        },
      },
      workoutLogs: {
        orderBy: { performedAt: "desc" },
        take: 14,
        select: {
          completed: true,
          performedAt: true,
        },
      },
      coachCallSessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          intake: {
            select: {
              goal: true,
              experience: true,
              injuries: true,
              daysPerWeek: true,
              sessionDuration: true,
              location: true,
              equipment: true,
              cardio: true,
              dislikes: true,
              energySchedule: true,
              summary: true,
              safetyNote: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  const profile = user.profile;
  const latestGoal = user.goals[0];
  const latestPlan = user.workoutPlans[0];
  const latestNutrition = user.nutritionPlans[0];
  const latestIntake = user.coachCallSessions[0]?.intake;
  const weightEntries = [...user.weightLogs].reverse();
  const currentWeight = weightEntries.at(-1)?.weightKg ?? profile?.weightKg ?? undefined;
  const baselineWeight = weightEntries[0]?.weightKg ?? profile?.weightKg ?? undefined;
  const weightDelta =
    currentWeight !== undefined && baselineWeight !== undefined
      ? roundToOneDecimal(currentWeight - baselineWeight)
      : undefined;

  const now = Date.now();
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = user.workoutSessions.filter((session) => session.startedAt >= fourteenDaysAgo);
  const recentCompletedSessions = recentSessions.filter((session) => session.status === "COMPLETED");
  const recentLegacyLogs = user.workoutLogs.filter((log) => log.performedAt >= fourteenDaysAgo && log.completed);
  const completedSessionsLast14Days =
    recentCompletedSessions.length || recentSessions.length ? recentCompletedSessions.length : recentLegacyLogs.length;
  const totalSessionsLast14Days =
    recentSessions.length || recentCompletedSessions.length ? recentSessions.length : Math.max(recentLegacyLogs.length, 1);
  const completedSessionsThisWeek = user.workoutSessions.filter(
    (session) => session.status === "COMPLETED" && session.startedAt >= sevenDaysAgo
  ).length;

  const knownFields: CoachKnownFields = {
    goal:
      normalizeText(latestIntake?.goal) ??
      normalizeText(profile?.currentGoal) ??
      normalizeText(profile?.goalType) ??
      normalizeText(latestGoal?.type),
    weight: currentWeight,
    height: profile?.heightCm ?? undefined,
    age: profile?.age ?? undefined,
    experience: normalizeText(latestIntake?.experience) ?? normalizeText(profile?.experienceLevel),
    injuries: normalizeText(latestIntake?.injuries) ?? normalizeText(profile?.injuries),
    daysPerWeek: latestIntake?.daysPerWeek ?? profile?.trainingDaysPerWeek ?? undefined,
    sessionDuration: latestIntake?.sessionDuration ?? profile?.sessionDurationMins ?? undefined,
    location: normalizeText(latestIntake?.location) ?? normalizeText(profile?.trainingLocation),
    equipment: normalizeText(latestIntake?.equipment) ?? normalizeText(profile?.availableEquipment),
    style: normalizeText(profile?.currentGoal),
    cardio: normalizeText(latestIntake?.cardio),
    dislikes: normalizeText(latestIntake?.dislikes),
    energySchedule: normalizeText(latestIntake?.energySchedule),
    dietaryPreference: normalizeText(profile?.dietaryPreference),
  };

  const missingFields = trackedFields.filter((field) => knownFields[field] === undefined);

  const workoutPlan = latestPlan
    ? {
        id: latestPlan.id,
        title: latestPlan.title,
        split: latestPlan.split,
        summary: latestPlan.summary,
        days: latestPlan.days.map((day) => ({
          id: day.id,
          name: day.name,
          focus: day.focus,
          status:
            day.sessions[0]?.status === "COMPLETED"
              ? "completed"
              : day.sessions[0]?.status === "ACTIVE"
                ? "in_progress"
                : "not_started",
        })),
      }
    : null;

  const quickInsight = buildQuickInsight({
    injuries: knownFields.injuries as string | undefined,
    goal: knownFields.goal as string | undefined,
    completionRateLast14Days: Math.round((completedSessionsLast14Days / totalSessionsLast14Days) * 100),
    completedSessionsThisWeek,
    trainingDaysPerWeek: knownFields.daysPerWeek as number | undefined,
    nutritionCalories: latestNutrition?.calories,
  });

  return {
    messages,
    context: {
      quickInsight,
      recentWorkoutProgress: {
        completionRateLast14Days: Math.round((completedSessionsLast14Days / totalSessionsLast14Days) * 100),
      },
      recentWeightTrend: {
        delta: weightDelta,
      },
      missingFields,
    },
    workoutProgress: {
      plan: workoutPlan,
    },
  };
}
