import "server-only";

import { prisma } from "@/lib/prisma";

const NUTRITION_PAGE_ERROR_TAG = "[nutrition-page-error]";

type MealSuggestion = {
  name: string;
  description: string;
  calories?: number;
};

type NutritionPlanView = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  guidance: string | null;
  sampleMeals: string | null;
};

type MealLogView = {
  id: string;
  mealType: string;
  calories: number;
};

export async function getNutritionPageData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      nutritionPlans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          guidance: true,
          sampleMeals: true,
        },
      },
      mealLogs: {
        orderBy: { date: "desc" },
        take: 5,
        select: {
          id: true,
          mealType: true,
          calories: true,
        },
      },
    },
  });

  const plan = user?.nutritionPlans[0] ?? null;
  const mealLogs = user?.mealLogs ?? [];

  let meals: MealSuggestion[] = [];

  if (plan?.sampleMeals) {
    try {
      const parsed = JSON.parse(plan.sampleMeals) as unknown;
      meals = Array.isArray(parsed)
        ? parsed.filter(
            (meal): meal is MealSuggestion =>
              typeof meal === "object" &&
              meal !== null &&
              typeof meal.name === "string" &&
              typeof meal.description === "string"
          )
        : [];
    } catch (error) {
      console.error(NUTRITION_PAGE_ERROR_TAG, {
        label: "sample-meals-parse",
        error: error instanceof Error ? error.message : "UnknownError",
      });
    }
  }

  return {
    plan,
    meals,
    mealLogs,
  };
}
