import type {
  MobileCoachFeedPayload,
  MobileDashboardPayload,
  MobileNutritionPayload,
  MobileProfilePayload,
  MobileProgressPayload,
  MobileWorkoutDayPayload,
  MobileWorkoutPlanPayload,
} from "@fitplus/contracts";
import { buildCompleteUserFitnessContext } from "@/lib/coach-context";
import { prisma } from "@/lib/prisma";
import { getWorkoutPlanProgress } from "@/lib/workout-progress";
import { formatDisplayDate } from "@/lib/utils";

export async function getMobileDashboardData(userId: string): Promise<MobileDashboardPayload> {
  const [user, context, workoutProgress] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        goals: { orderBy: { updatedAt: "desc" }, take: 1 },
        nutritionPlans: { orderBy: { createdAt: "desc" }, take: 1 },
        weightLogs: { orderBy: { date: "asc" } },
        chatMessages: { orderBy: { createdAt: "desc" }, take: 4 },
      },
    }),
    buildCompleteUserFitnessContext(userId),
    getWorkoutPlanProgress(userId),
  ]);

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    quickInsight: context.quickInsight,
    coachInsight: workoutProgress.plan?.summary ?? context.quickInsight,
    currentGoal: user.goals[0]?.type ?? context.profile.goalType ?? "Lean + strong",
    weeklyCompletionPercent: workoutProgress.weeklyCompletionPercent,
    completedDays: workoutProgress.completedDays,
    totalDays: workoutProgress.totalDays,
    nextWorkout: workoutProgress.nextWorkout
      ? {
          id: workoutProgress.nextWorkout.id,
          name: workoutProgress.nextWorkout.name,
          focus: workoutProgress.nextWorkout.focus,
          status: workoutProgress.nextWorkout.status,
          completionPercent: workoutProgress.nextWorkout.completionPercent,
        }
      : null,
    nutritionTarget: user.nutritionPlans[0]
      ? {
          calories: user.nutritionPlans[0].calories,
          protein: user.nutritionPlans[0].protein,
          carbs: user.nutritionPlans[0].carbs,
          fat: user.nutritionPlans[0].fat,
        }
      : null,
    recentMessages: [...user.chatMessages].reverse().map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
    weightSeries:
      user.weightLogs.length > 0
        ? user.weightLogs.map((entry) => ({
            label: formatDisplayDate(entry.date),
            value: entry.weightKg,
          }))
        : [
            { label: "Week 1", value: 82.4 },
            { label: "Week 2", value: 82.0 },
            { label: "Week 3", value: 81.6 },
            { label: "Week 4", value: 81.2 },
          ],
  };
}

export async function getMobileWorkoutPlanData(userId: string): Promise<MobileWorkoutPlanPayload> {
  const workoutProgress = await getWorkoutPlanProgress(userId);

  return {
    plan: workoutProgress.plan
      ? {
          id: workoutProgress.plan.id,
          title: workoutProgress.plan.title,
          split: workoutProgress.plan.split,
          summary: workoutProgress.plan.summary,
          days: workoutProgress.plan.days.map((day) => ({
            id: day.id,
            name: day.name,
            dayOfWeek: day.dayOfWeek,
            focus: day.focus,
            rationale: day.rationale,
            coachTip: day.coachTip,
            targetDurationMins: day.targetDurationMins,
            status: day.status,
            completionPercent: day.completionPercent,
            completedExercises: day.completedExercises,
            totalExercises: day.totalExercises,
          })),
        }
      : null,
    weeklyCompletionPercent: workoutProgress.weeklyCompletionPercent,
    completedDays: workoutProgress.completedDays,
    totalDays: workoutProgress.totalDays,
  };
}

export async function getMobileWorkoutDayData(
  userId: string,
  dayId: string
): Promise<MobileWorkoutDayPayload | null> {
  const workoutProgress = await getWorkoutPlanProgress(userId);
  const day = workoutProgress.plan?.days.find((item) => item.id === dayId);

  if (!day) {
    return null;
  }

  return {
    day: {
      id: day.id,
      name: day.name,
      dayOfWeek: day.dayOfWeek,
      focus: day.focus,
      rationale: day.rationale,
      coachTip: day.coachTip,
      targetDurationMins: day.targetDurationMins,
      exercises: day.exercises,
    },
    latestSession: day.latestSession ?? null,
  };
}

export async function getMobileNutritionData(userId: string): Promise<MobileNutritionPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      nutritionPlans: { orderBy: { createdAt: "desc" }, take: 1 },
      mealLogs: { orderBy: { date: "desc" }, take: 8 },
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const plan = user.nutritionPlans[0];

  return {
    plan: plan
      ? {
          id: plan.id,
          calories: plan.calories,
          protein: plan.protein,
          carbs: plan.carbs,
          fat: plan.fat,
          guidance: plan.guidance,
          sampleMeals: plan.sampleMeals
            ? (JSON.parse(plan.sampleMeals) as NonNullable<MobileNutritionPayload["plan"]>["sampleMeals"])
            : [],
        }
      : null,
    recentMeals: user.mealLogs.map((log) => ({
      id: log.id,
      date: log.date.toISOString(),
      mealType: log.mealType,
      calories: log.calories,
      protein: log.protein ?? 0,
      carbs: log.carbs ?? 0,
      fat: log.fat ?? 0,
      notes: log.notes,
    })),
  };
}

export async function getMobileProgressData(userId: string): Promise<MobileProgressPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      weightLogs: { orderBy: { date: "asc" } },
      workoutSessions: { orderBy: { startedAt: "desc" }, take: 14 },
      workoutLogs: { orderBy: { performedAt: "desc" }, take: 14 },
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const sessionHistory =
    user.workoutSessions.length > 0
      ? user.workoutSessions.map((session) => ({
          id: session.id,
          status: session.status,
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
        }))
      : user.workoutLogs.map((log) => ({
          id: log.id,
          status: log.completed ? "COMPLETED" : "ACTIVE",
        }));

  const completedCount = sessionHistory.filter((entry) => entry.status === "COMPLETED").length;
  const adherencePercent = sessionHistory.length
    ? Math.round((completedCount / sessionHistory.length) * 100)
    : 0;

  return {
    adherencePercent,
    weightSeries:
      user.weightLogs.length > 0
        ? user.weightLogs.map((entry) => ({
            label: formatDisplayDate(entry.date),
            value: entry.weightKg,
          }))
        : [
            { label: "Week 1", value: 82 },
            { label: "Week 2", value: 81.6 },
            { label: "Week 3", value: 81.2 },
            { label: "Week 4", value: 80.9 },
          ],
    recentSessions: sessionHistory,
  };
}

export async function getMobileProfileData(userId: string): Promise<MobileProfilePayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscription: true,
      accounts: { orderBy: { provider: "asc" } },
      billingProfile: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role as MobileProfilePayload["user"]["role"],
      status: user.status,
      emailVerified: Boolean(user.emailVerified),
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    },
    profile: user.profile
      ? {
          age: user.profile.age,
          sex: user.profile.sex,
          heightCm: user.profile.heightCm,
          weightKg: user.profile.weightKg,
          currentGoal: user.profile.currentGoal,
          goalType: user.profile.goalType,
          experienceLevel: user.profile.experienceLevel,
          trainingDaysPerWeek: user.profile.trainingDaysPerWeek,
          sessionDurationMins: user.profile.sessionDurationMins,
          trainingLocation: user.profile.trainingLocation,
          availableEquipment: user.profile.availableEquipment,
          injuries: user.profile.injuries,
          dietaryPreference: user.profile.dietaryPreference,
        }
      : null,
    subscription: user.subscription
      ? {
          plan: user.subscription.plan,
          status: user.subscription.status,
          planTier: user.subscription.planTier,
          provider: user.subscription.provider,
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
        }
      : null,
    billingProfile: user.billingProfile
      ? {
          provider: user.billingProfile.provider,
          billingEmail: user.billingProfile.billingEmail,
          countryCode: user.billingProfile.countryCode,
        }
      : null,
    linkedProviders: user.accounts.map((account) => account.provider),
    adminNote:
      user.role === "ADMIN" || user.role === "SUPERADMIN"
        ? "Operational dashboards stay web-first on mobile for now."
        : null,
  };
}

export async function getMobileCoachFeed(userId: string): Promise<MobileCoachFeedPayload> {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    messages: [...messages].reverse().map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}
