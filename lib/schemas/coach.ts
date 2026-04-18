import { z } from "zod";

const optionalText = z.string().trim().min(1).max(400).optional();

export const intakeZod = z.object({
  goal: optionalText,
  weight: z.number().min(30).max(400).optional(),
  height: z.number().min(100).max(250).optional(),
  age: z.number().int().min(13).max(100).optional(),
  experience: optionalText,
  injuries: optionalText,
  daysPerWeek: z.number().int().min(2).max(7).optional(),
  sessionDuration: z.number().int().min(20).max(120).optional(),
  location: optionalText,
  equipment: optionalText,
  style: optionalText,
  cardio: optionalText,
  dislikes: optionalText,
  energySchedule: optionalText,
  safetyNote: optionalText,
  summary: optionalText,
});

export const workoutExerciseZod = z.object({
  name: z.string().trim().min(2).max(80),
  muscleGroup: z.string().trim().min(2).max(40),
  sets: z.number().int().min(1).max(6),
  reps: z.number().int().min(3).max(30),
  restSeconds: z.number().int().min(0).max(300).optional(),
  notes: z.string().trim().min(1).max(220).optional(),
});

export const workoutDayZod = z.object({
  name: z.string().trim().min(2).max(80),
  dayOfWeek: z.string().trim().min(2).max(20).optional(),
  focus: z.string().trim().min(2).max(120).optional(),
  rationale: z.string().trim().min(8).max(280).optional(),
  coachTip: z.string().trim().min(8).max(220).optional(),
  targetDurationMins: z.number().int().min(20).max(120).optional(),
  exercises: z.array(workoutExerciseZod).min(3).max(8),
});

export const workoutPlanZod = z.object({
  title: z.string().trim().min(4).max(120),
  split: z.string().trim().min(3).max(80).optional(),
  summary: z.string().trim().min(12).max(360).optional(),
  days: z.array(workoutDayZod).min(2).max(7),
}).superRefine((plan, ctx) => {
  const seen = new Set<string>();

  plan.days.forEach((day, index) => {
    const normalized = day.name.toLowerCase();
    if (seen.has(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Workout day names must be unique.",
        path: ["days", index, "name"],
      });
    }
    seen.add(normalized);
  });
});

export const nutritionPlanZod = z.object({
  calories: z.number().int().min(1200).max(5000),
  protein: z.number().int().min(80).max(320),
  carbs: z.number().int().min(50).max(500),
  fat: z.number().int().min(30).max(160),
  guidance: z.string().trim().min(12).max(360).optional(),
  meals: z.array(
    z.object({
      name: z.string().trim().min(2).max(60),
      description: z.string().trim().min(8).max(180),
      calories: z.number().int().min(100).max(1400).optional(),
    })
  ).min(3).max(5),
});

export type CoachIntakePayload = z.infer<typeof intakeZod>;
export type WorkoutExercisePayload = z.infer<typeof workoutExerciseZod>;
export type WorkoutDayPayload = z.infer<typeof workoutDayZod>;
export type WorkoutPlanPayload = z.infer<typeof workoutPlanZod>;
export type NutritionPlanPayload = z.infer<typeof nutritionPlanZod>;
