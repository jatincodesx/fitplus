import { prisma } from "./prisma";
import { formatDisplayDate } from "./utils";

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

export type CompleteUserFitnessContext = {
  userId: string;
  athleteName: string;
  email: string;
  profile: {
    age?: number;
    sex?: string;
    heightCm?: number;
    weightKg?: number;
    goalType?: string;
    currentGoal?: string;
    experienceLevel?: string;
    trainingLocation?: string;
    availableEquipment?: string;
    injuries?: string;
    trainingDaysPerWeek?: number;
    sessionDurationMins?: number;
    dietaryPreference?: string;
  };
  latestGoal?: {
    type?: string;
    notes?: string | null;
    targetWeight?: number | null;
  };
  currentPlan?: {
    id: string;
    title: string;
    split?: string | null;
    summary?: string | null;
    dayCount: number;
    dayNames: string[];
  };
  nutritionPlan?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    guidance?: string | null;
  };
  latestIntake?: {
    goal?: string | null;
    experience?: string | null;
    injuries?: string | null;
    daysPerWeek?: number | null;
    sessionDuration?: number | null;
    location?: string | null;
    equipment?: string | null;
    summary?: string | null;
    safetyNote?: string | null;
  };
  recentWeightTrend: {
    current?: number;
    delta?: number;
    entries: { date: string; weightKg: number }[];
  };
  recentWorkoutProgress: {
    completedSessionsLast14Days: number;
    totalSessionsLast14Days: number;
    completionRateLast14Days: number;
    completedSessionsThisWeek: number;
    latestCompletedDay?: string;
  };
  recentCoachMessages: { role: string; content: string }[];
  knownFields: CoachKnownFields;
  missingFields: string[];
  promptContext: string;
  quickInsight: string;
};

export type CoachContext = {
  context: string;
  known: Record<string, string | number | undefined>;
  missing: string[];
  structured: CompleteUserFitnessContext;
};

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function roundToOneDecimal(value?: number) {
  if (value === undefined) return undefined;
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

export async function buildCompleteUserFitnessContext(
  userId: string
): Promise<CompleteUserFitnessContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      goals: { orderBy: { updatedAt: "desc" }, take: 1 },
      workoutPlans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          days: {
            orderBy: { order: "asc" },
            include: { exercises: { orderBy: { order: "asc" } } },
          },
        },
      },
      nutritionPlans: { orderBy: { createdAt: "desc" }, take: 1 },
      weightLogs: { orderBy: { date: "desc" }, take: 6 },
      workoutSessions: {
        orderBy: { startedAt: "desc" },
        take: 10,
        include: { workoutDay: true },
      },
      workoutLogs: {
        orderBy: { performedAt: "desc" },
        take: 14,
        include: { workoutDay: true },
      },
      chatMessages: { orderBy: { createdAt: "desc" }, take: 6 },
      coachCallSessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { intake: true },
      },
    },
  });

  if (!user) {
    throw new Error("User not found while building coach context.");
  }

  const profile = user.profile;
  const latestGoal = user.goals[0];
  const latestPlan = user.workoutPlans[0];
  const latestNutrition = user.nutritionPlans[0];
  const latestCall = user.coachCallSessions[0];
  const latestIntake = latestCall?.intake;
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
  const recentLegacyLogs = user.workoutLogs.filter(
    (log) => log.performedAt >= fourteenDaysAgo && log.completed
  );
  const completedSessionsLast14Days =
    recentCompletedSessions.length || recentSessions.length ? recentCompletedSessions.length : recentLegacyLogs.length;
  const totalSessionsLast14Days =
    recentSessions.length || recentCompletedSessions.length ? recentSessions.length : Math.max(recentLegacyLogs.length, 1);
  const completedSessionsThisWeek = user.workoutSessions.filter(
    (session) => session.status === "COMPLETED" && session.startedAt >= sevenDaysAgo
  ).length;
  const latestCompletedDay = user.workoutSessions.find((session) => session.status === "COMPLETED")?.workoutDay?.name;

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

  const promptLines = [
    `Athlete: ${user.name ?? "Athlete"} (${user.email})`,
    `Goal: ${knownFields.goal ?? "not captured yet"}`,
    `Profile: age ${knownFields.age ?? "n/a"}, ${knownFields.weight ?? "n/a"} kg, ${knownFields.height ?? "n/a"} cm, experience ${knownFields.experience ?? "n/a"}`,
    `Training setup: ${knownFields.daysPerWeek ?? "n/a"} days/week, ${knownFields.sessionDuration ?? "n/a"} min sessions, location ${knownFields.location ?? "n/a"}, equipment ${knownFields.equipment ?? "n/a"}`,
    `Limitations: ${knownFields.injuries ?? "none reported"}`,
    `Nutrition preference: ${knownFields.dietaryPreference ?? "not specified"}`,
  ];

  if (latestPlan) {
    promptLines.push(
      `Current workout plan: ${latestPlan.title}${latestPlan.split ? ` (${latestPlan.split})` : ""}; days: ${latestPlan.days
        .map((day) => day.name)
        .join(", ")}`
    );
  }

  if (latestNutrition) {
    promptLines.push(
      `Current nutrition target: ${latestNutrition.calories} kcal, ${latestNutrition.protein}p / ${latestNutrition.carbs}c / ${latestNutrition.fat}f`
    );
  }

  if (weightEntries.length) {
    promptLines.push(
      `Recent weight trend: ${weightEntries
        .map((entry) => `${formatDisplayDate(entry.date)} ${entry.weightKg}kg`)
        .join(" | ")}`
    );
  }

  if (latestIntake?.summary) {
    promptLines.push(`Latest coach intake summary: ${latestIntake.summary}`);
  }

  if (user.chatMessages.length) {
    promptLines.push(
      `Recent coach chat themes: ${[...user.chatMessages]
        .reverse()
        .map((message) => `${message.role === "ASSISTANT" ? "Coach" : "User"}: ${message.content}`)
        .join(" | ")}`
    );
  }

  promptLines.push(
    `Recent workout consistency: ${completedSessionsLast14Days}/${totalSessionsLast14Days} sessions completed in the last 14 days`
  );

  const quickInsight = buildQuickInsight({
    injuries: knownFields.injuries as string | undefined,
    goal: knownFields.goal as string | undefined,
    completionRateLast14Days: Math.round((completedSessionsLast14Days / totalSessionsLast14Days) * 100),
    completedSessionsThisWeek,
    trainingDaysPerWeek: knownFields.daysPerWeek as number | undefined,
    nutritionCalories: latestNutrition?.calories,
  });

  return {
    userId: user.id,
    athleteName: user.name ?? "Athlete",
    email: user.email,
    profile: {
      age: profile?.age ?? undefined,
      sex: normalizeText(profile?.sex),
      heightCm: profile?.heightCm ?? undefined,
      weightKg: profile?.weightKg ?? undefined,
      goalType: normalizeText(profile?.goalType),
      currentGoal: normalizeText(profile?.currentGoal),
      experienceLevel: normalizeText(profile?.experienceLevel),
      trainingLocation: normalizeText(profile?.trainingLocation),
      availableEquipment: normalizeText(profile?.availableEquipment),
      injuries: normalizeText(profile?.injuries),
      trainingDaysPerWeek: profile?.trainingDaysPerWeek ?? undefined,
      sessionDurationMins: profile?.sessionDurationMins ?? undefined,
      dietaryPreference: normalizeText(profile?.dietaryPreference),
    },
    latestGoal: latestGoal
      ? {
          type: normalizeText(latestGoal.type),
          notes: latestGoal.notes,
          targetWeight: latestGoal.targetWeight,
        }
      : undefined,
    currentPlan: latestPlan
      ? {
          id: latestPlan.id,
          title: latestPlan.title,
          split: latestPlan.split,
          summary: latestPlan.summary,
          dayCount: latestPlan.days.length,
          dayNames: latestPlan.days.map((day) => day.name),
        }
      : undefined,
    nutritionPlan: latestNutrition
      ? {
          calories: latestNutrition.calories,
          protein: latestNutrition.protein,
          carbs: latestNutrition.carbs,
          fat: latestNutrition.fat,
          guidance: latestNutrition.guidance,
        }
      : undefined,
    latestIntake: latestIntake
      ? {
          goal: latestIntake.goal,
          experience: latestIntake.experience,
          injuries: latestIntake.injuries,
          daysPerWeek: latestIntake.daysPerWeek,
          sessionDuration: latestIntake.sessionDuration,
          location: latestIntake.location,
          equipment: latestIntake.equipment,
          summary: latestIntake.summary,
          safetyNote: latestIntake.safetyNote,
        }
      : undefined,
    recentWeightTrend: {
      current: currentWeight,
      delta: weightDelta,
      entries: weightEntries.map((entry) => ({
        date: formatDisplayDate(entry.date),
        weightKg: entry.weightKg,
      })),
    },
    recentWorkoutProgress: {
      completedSessionsLast14Days,
      totalSessionsLast14Days,
      completionRateLast14Days: Math.round((completedSessionsLast14Days / totalSessionsLast14Days) * 100),
      completedSessionsThisWeek,
      latestCompletedDay,
    },
    recentCoachMessages: [...user.chatMessages]
      .reverse()
      .map((message) => ({ role: message.role, content: message.content })),
    knownFields,
    missingFields,
    promptContext: promptLines.join("\n"),
    quickInsight,
  };
}

export async function buildCoachContextForUser(userId: string): Promise<CoachContext> {
  const structured = await buildCompleteUserFitnessContext(userId);

  return {
    context: structured.promptContext,
    known: structured.knownFields,
    missing: structured.missingFields,
    structured,
  };
}
