import { requireApiCustomerAppAccess } from "@/lib/auth";
import { apiOk, ApiError, handleApiError, parseJsonBody } from "@/lib/api";
import { createAuditLog, getAuditRequestContext } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  buildRationale,
  extractCoachIntakeFromMessages,
  saveWorkoutPlanFromSuggestion,
} from "@/lib/coach-call";
import { buildCompleteUserFitnessContext } from "@/lib/coach-context";
import {
  generateAdvancedNutritionGuidance,
  generateAdvancedWorkoutWeek,
} from "@/lib/fitness-generation";
import { coachCallCompleteSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const payload = await parseJsonBody(req, coachCallCompleteSchema);

    const call = await prisma.coachCallSession.findFirst({
      where: { id: payload.sessionId, userId: sessionUser.id },
      include: { transcripts: true },
    });
    if (!call) {
      throw new ApiError(404, "Session not found.");
    }

    const transcriptText = call.transcripts
      .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
      .map((item) => `${item.role === "USER" ? "User" : "Coach"}: ${item.content}`)
      .join("\n");

    const intake = await extractCoachIntakeFromMessages(payload.sessionId, transcriptText);
    const summary = intake.summary ?? call.summary ?? "Session completed.";

    await prisma.coachIntakeProfile.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        goal: intake.goal,
        weight: intake.weight,
        height: intake.height,
        age: intake.age,
        experience: intake.experience,
        injuries: intake.injuries,
        daysPerWeek: intake.daysPerWeek,
        sessionDuration: intake.sessionDuration,
        location: intake.location,
        equipment: intake.equipment,
        style: intake.style,
        cardio: intake.cardio,
        dislikes: intake.dislikes,
        energySchedule: intake.energySchedule,
        safetyNote: intake.safetyNote,
        summary: intake.summary,
        rawJson: JSON.stringify(intake),
      },
      update: {
        goal: intake.goal,
        weight: intake.weight,
        height: intake.height,
        age: intake.age,
        experience: intake.experience,
        injuries: intake.injuries,
        daysPerWeek: intake.daysPerWeek,
        sessionDuration: intake.sessionDuration,
        location: intake.location,
        equipment: intake.equipment,
        style: intake.style,
        cardio: intake.cardio,
        dislikes: intake.dislikes,
        energySchedule: intake.energySchedule,
        safetyNote: intake.safetyNote,
        summary: intake.summary,
        rawJson: JSON.stringify(intake),
      },
    });

    const userContext = await buildCompleteUserFitnessContext(sessionUser.id);
    const workoutGeneration = await generateAdvancedWorkoutWeek(userContext);
    const nutritionGeneration = await generateAdvancedNutritionGuidance(userContext);

    const plan = await saveWorkoutPlanFromSuggestion(sessionUser.id, workoutGeneration.suggestion);

    await prisma.nutritionPlan.deleteMany({ where: { userId: sessionUser.id } });
    const nutritionPlan = await prisma.nutritionPlan.create({
      data: {
        userId: sessionUser.id,
        calories: nutritionGeneration.suggestion.calories,
        protein: nutritionGeneration.suggestion.protein,
        carbs: nutritionGeneration.suggestion.carbs,
        fat: nutritionGeneration.suggestion.fat,
        guidance: nutritionGeneration.suggestion.guidance ?? null,
        sampleMeals: JSON.stringify(nutritionGeneration.suggestion.meals),
      },
    });

    await prisma.coachPlanGenerationLog.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        workoutPlanId: plan.id,
        provider:
          workoutGeneration.source === "ai" || nutritionGeneration.source === "ai" ? "ollama" : "fallback",
        model:
          workoutGeneration.source === "ai" || nutritionGeneration.source === "ai"
            ? process.env.OLLAMA_MODEL ?? "llama3.2"
            : "deterministic-fallback",
        notes:
          workoutGeneration.source === "ai"
            ? "Workout week generated with AI refinement over a validated structured skeleton."
            : workoutGeneration.error ?? "Deterministic fallback workout generation used.",
      },
      update: {
        workoutPlanId: plan.id,
        provider:
          workoutGeneration.source === "ai" || nutritionGeneration.source === "ai" ? "ollama" : "fallback",
        model:
          workoutGeneration.source === "ai" || nutritionGeneration.source === "ai"
            ? process.env.OLLAMA_MODEL ?? "llama3.2"
            : "deterministic-fallback",
        notes:
          workoutGeneration.source === "ai"
            ? "Workout week generated with AI refinement over a validated structured skeleton."
            : workoutGeneration.error ?? "Deterministic fallback workout generation used.",
      },
    });

    await prisma.coachCallSession.update({
      where: { id: payload.sessionId },
      data: {
        status: "COMPLETED",
        generationStatus: "COMPLETED",
        generationError: null,
        summary: workoutGeneration.suggestion.summary ?? summary ?? buildRationale(intake),
        endedAt: new Date(),
      },
    });

    const requestContext = await getAuditRequestContext(req);
    await createAuditLog({
      actorUserId: sessionUser.id,
      targetUserId: sessionUser.id,
      eventType: "COACH_CALL_COMPLETED",
      entityType: "CoachCallSession",
      entityId: payload.sessionId,
      metadata: {
        workoutSource: workoutGeneration.source,
        nutritionSource: nutritionGeneration.source,
        workoutPlanId: plan.id,
        nutritionPlanId: nutritionPlan.id,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return apiOk({
      summary: workoutGeneration.suggestion.summary ?? summary,
      planId: plan.id,
      nutritionPlanId: nutritionPlan.id,
      intake,
      rationale: workoutGeneration.suggestion.summary ?? buildRationale(intake),
      source: {
        workout: workoutGeneration.source,
        nutrition: nutritionGeneration.source,
      },
    });
  } catch (error) {
    return handleApiError(error, "Could not complete the coach session.");
  }
}
