export const USER_ROLES = ["USER", "ADMIN", "SUPERADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type MobileSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  status: string;
  emailVerified: boolean;
  onboardingCompletedAt?: string | null;
};

export type MobileSessionPayload = {
  token: string;
  expiresAt: string;
  user: MobileSessionUser;
};

export type MobileDashboardPayload = {
  quickInsight: string;
  coachInsight: string;
  currentGoal: string;
  weeklyCompletionPercent: number;
  completedDays: number;
  totalDays: number;
  nextWorkout: {
    id: string;
    name: string;
    focus?: string | null;
    status: "not_started" | "in_progress" | "completed";
    completionPercent: number;
  } | null;
  nutritionTarget: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  recentMessages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }[];
  weightSeries: {
    label: string;
    value: number;
  }[];
};

export type MobileWorkoutPlanPayload = {
  plan: {
    id: string;
    title: string;
    split?: string | null;
    summary?: string | null;
    days: {
      id: string;
      name: string;
      dayOfWeek?: string | null;
      focus?: string | null;
      rationale?: string | null;
      coachTip?: string | null;
      targetDurationMins?: number | null;
      status: "not_started" | "in_progress" | "completed";
      completionPercent: number;
      completedExercises: number;
      totalExercises: number;
    }[];
  } | null;
  weeklyCompletionPercent: number;
  completedDays: number;
  totalDays: number;
};

export type MobileWorkoutDayPayload = {
  day: {
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
  };
  latestSession?: {
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
  } | null;
};

export type MobileNutritionPayload = {
  plan: {
    id: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    guidance?: string | null;
    sampleMeals: {
      name: string;
      description: string;
      calories?: number;
    }[];
  } | null;
  recentMeals: {
    id: string;
    date: string;
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    notes?: string | null;
  }[];
};

export type MobileProgressPayload = {
  adherencePercent: number;
  weightSeries: {
    label: string;
    value: number;
  }[];
  recentSessions: {
    id: string;
    status: string;
    startedAt?: string;
    completedAt?: string | null;
  }[];
};

export type MobileProfilePayload = {
  user: MobileSessionUser;
  profile: {
    age?: number | null;
    sex?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    currentGoal?: string | null;
    goalType?: string | null;
    experienceLevel?: string | null;
    trainingDaysPerWeek?: number | null;
    sessionDurationMins?: number | null;
    trainingLocation?: string | null;
    availableEquipment?: string | null;
    injuries?: string | null;
    dietaryPreference?: string | null;
  } | null;
  subscription: {
    plan?: string | null;
    status?: string | null;
    planTier?: string | null;
    provider?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean | null;
  } | null;
  billingProfile: {
    provider?: string | null;
    billingEmail?: string | null;
    countryCode?: string | null;
  } | null;
  linkedProviders: string[];
  adminNote: string | null;
};

export type MobileOnboardingInput = {
  age: number;
  sex: string;
  heightCm: number;
  weightKg: number;
  goalType: string;
  currentGoal?: string;
  experienceLevel: string;
  trainingLocation: string;
  availableEquipment?: string;
  injuries?: string;
  trainingDaysPerWeek: number;
  sessionDurationMins: number;
  dietaryPreference?: string;
};

export type MobileCoachFeedPayload = {
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }[];
};
