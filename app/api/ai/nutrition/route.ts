import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { buildCompleteUserFitnessContext } from "@/lib/coach-context";
import { generateAdvancedNutritionGuidance } from "@/lib/fitness-generation";

export async function POST() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();

    const context = await buildCompleteUserFitnessContext(sessionUser.id);
    const generated = await generateAdvancedNutritionGuidance(context);

    await prisma.nutritionPlan.deleteMany({ where: { userId: sessionUser.id } });
    const plan = await prisma.nutritionPlan.create({
      data: {
        userId: sessionUser.id,
        calories: generated.suggestion.calories,
        protein: generated.suggestion.protein,
        carbs: generated.suggestion.carbs,
        fat: generated.suggestion.fat,
        guidance: generated.suggestion.guidance ?? null,
        sampleMeals: JSON.stringify(generated.suggestion.meals),
      },
    });

    const requestContext = await getAuditRequestContext();
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "AI_NUTRITION_PLAN_GENERATED",
      entityType: "NutritionPlan",
      entityId: plan.id,
      metadata: {
        source: generated.source,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({
      plan,
      source: generated.source,
      message:
        generated.source === "ai"
          ? "AI generated nutrition guidance."
          : generated.error ?? "Structured fallback nutrition guidance generated.",
    });
  } catch (error) {
    return handleApiError(error, "Could not generate nutrition guidance.");
  }
}
