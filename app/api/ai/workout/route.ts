import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { buildCompleteUserFitnessContext } from "@/lib/coach-context";
import { generateAdvancedWorkoutWeek } from "@/lib/fitness-generation";
import { saveWorkoutPlanFromSuggestion } from "@/lib/coach-call";

export async function POST() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();

    const context = await buildCompleteUserFitnessContext(sessionUser.id);
    const generated = await generateAdvancedWorkoutWeek(context);
    const plan = await saveWorkoutPlanFromSuggestion(sessionUser.id, generated.suggestion);

    const requestContext = await getAuditRequestContext();
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "AI_WORKOUT_PLAN_GENERATED",
      entityType: "WorkoutPlan",
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
          ? "AI generated a structured premium plan."
          : generated.error ?? "Structured fallback plan generated.",
    });
  } catch (error) {
    return handleApiError(error, "Could not generate the workout plan.");
  }
}
