import { z } from "zod";

const cuidSchema = z.string().cuid("Invalid identifier.");
const trimmedOptionalText = z
  .string()
  .trim()
  .max(500, "Too long.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(80, "Name is too long."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().trim().min(8, "Minimum 8 characters"),
});

export const onboardingSchema = z.object({
  age: z.coerce.number().min(13).max(100),
  sex: z.string().trim().min(1).max(40),
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(30).max(400),
  goalType: z.string().trim().min(1).max(80),
  currentGoal: z.string().trim().max(160).optional(),
  experienceLevel: z.string().trim().min(1).max(80),
  trainingLocation: z.string().trim().min(1).max(80),
  availableEquipment: z.string().trim().max(200).optional(),
  injuries: z.string().trim().max(200).optional(),
  trainingDaysPerWeek: z.coerce.number().min(2).max(7),
  sessionDurationMins: z.coerce.number().min(20).max(180),
  dietaryPreference: z.string().trim().max(120).optional(),
});

export const weightLogSchema = z.object({
  date: z.coerce.date(),
  weightKg: z.coerce.number().min(30).max(400),
});

export const mealLogSchema = z.object({
  date: z.coerce.date(),
  mealType: z.string().trim().min(1).max(80),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  notes: trimmedOptionalText,
});

export const aiCoachMessageSchema = z.object({
  message: z.string().trim().min(1, "Message required").max(2000, "Message is too long."),
});

export const workoutLogSchema = z
  .object({
    exerciseId: cuidSchema.optional(),
    workoutDayId: cuidSchema.optional(),
    notes: trimmedOptionalText,
  })
  .refine((value) => value.exerciseId || value.workoutDayId, {
    message: "Exercise or workout day is required.",
    path: ["exerciseId"],
  });

export const workoutSessionCreateSchema = z.object({
  workoutDayId: cuidSchema,
  forceNew: z.boolean().optional().default(false),
});

export const workoutSessionExerciseUpdateSchema = z.object({
  sessionExerciseId: cuidSchema,
  completedSets: z.number().int().min(0).max(20),
});

export const coachCallRespondSchema = z.object({
  sessionId: cuidSchema,
  message: z.string().trim().min(1, "Message required").max(2000, "Message is too long."),
});

export const coachCallCompleteSchema = z.object({
  sessionId: cuidSchema,
});
