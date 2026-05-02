import { Card, CardHeader } from "@/components/ui/card";
import { GenerateNutritionButton } from "@/components/nutrition/generate-nutrition-button";
import { MealLogForm } from "@/components/nutrition/meal-log-form";
import { requireCustomerAppAccess } from "@/lib/auth";
import { getNutritionPageData } from "@/lib/nutrition-data";

export default async function NutritionPage() {
  const sessionUser = await requireCustomerAppAccess();
  let loadFailed = false;
  let plan = null;
  let meals: Awaited<ReturnType<typeof getNutritionPageData>>["meals"] = [];
  let mealLogs: Awaited<ReturnType<typeof getNutritionPageData>>["mealLogs"] = [];

  try {
    const data = await getNutritionPageData(sessionUser.id);
    plan = data.plan;
    meals = data.meals;
    mealLogs = data.mealLogs;
  } catch (error) {
    loadFailed = true;
    console.error("[nutrition-page-error]", {
      label: "nutrition-page-data",
      error: error instanceof Error ? error.message : "UnknownError",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Fuel</p>
          <h1 className="text-3xl font-semibold">Nutrition planner</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Macro targets and guidance that now use the same athlete context as workouts and coaching.
          </p>
        </div>
        <GenerateNutritionButton />
      </div>

      {loadFailed ? (
        <Card className="border-amber-400/30 bg-amber-500/10">
          <CardHeader title="Nutrition data could not load" description="This page is showing a degraded state instead of fake defaults." />
          <p className="text-sm text-amber-100">
            Refresh this page to retry. If it still fails, the database path is still unhealthy in production.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-5 lg:col-span-2">
          <CardHeader
            title="Daily targets"
            description={
              loadFailed
                ? "Targets are unavailable until the nutrition query succeeds again"
                : plan
                  ? "Generated from your current training context"
                  : "Generate a nutrition target to personalize this view"
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Calories</p>
              <p className="mt-2 text-2xl font-semibold">{plan ? plan.calories : loadFailed ? "—" : "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Protein</p>
              <p className="mt-2 text-2xl font-semibold">{plan ? `${plan.protein} g` : loadFailed ? "—" : "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Carbs</p>
              <p className="mt-2 text-2xl font-semibold">{plan ? `${plan.carbs} g` : loadFailed ? "—" : "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Fat</p>
              <p className="mt-2 text-2xl font-semibold">{plan ? `${plan.fat} g` : loadFailed ? "—" : "Not set"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-accent)]/7 p-4 text-sm text-[var(--color-muted)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Coach Guidance</p>
            <p className="mt-2 text-base text-foreground">
              {loadFailed
                ? "Nutrition guidance is temporarily unavailable because the database query failed."
                : plan?.guidance ?? "Generate a nutrition target to get context-aware guidance for your current workout block."}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {loadFailed ? (
              <p className="text-sm text-[var(--color-muted)]">Meal suggestions are temporarily unavailable.</p>
            ) : meals.length ? (
              meals.map((meal, index) => (
                <div key={`${meal.name}-${index}`} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{meal.name}</p>
                    {meal.calories ? <p className="text-xs text-[var(--color-muted)]">{meal.calories} kcal</p> : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{meal.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No meal suggestions yet. Generate a nutrition target to populate this section.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Log a meal" description="Keep intake honest without adding friction" />
          <MealLogForm />
          <div className="mt-4 space-y-2 text-xs text-[var(--color-muted)]">
            <p className="font-semibold text-foreground">Recent</p>
            {loadFailed ? (
              <p>Recent meal logs are temporarily unavailable.</p>
            ) : mealLogs.length ? (
              mealLogs.map((log) => (
                <p key={log.id}>
                  {log.mealType}: {log.calories} kcal
                </p>
              ))
            ) : (
              <p>No meals logged yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
