import { WorkoutPlanSuggestion } from "./ai";

type ContextHints = {
  experience?: string;
  sessionDuration?: number;
  trainingLocation?: string;
};

const accessories = [
  { name: "Dumbbell Lateral Raise", muscleGroup: "Shoulders", sets: 3, reps: 12, restSeconds: 60 },
  { name: "Face Pull", muscleGroup: "Upper Back", sets: 3, reps: 15, restSeconds: 60 },
  { name: "Leg Curl", muscleGroup: "Hamstrings", sets: 3, reps: 12, restSeconds: 90 },
  { name: "Leg Extension", muscleGroup: "Quads", sets: 3, reps: 12, restSeconds: 90 },
  { name: "Calf Raise", muscleGroup: "Calves", sets: 3, reps: 15, restSeconds: 60 },
  { name: "Hanging Knee Raise", muscleGroup: "Core", sets: 3, reps: 12, restSeconds: 60 },
  { name: "Cable Row", muscleGroup: "Back", sets: 3, reps: 10, restSeconds: 90 },
  { name: "Incline DB Press", muscleGroup: "Chest", sets: 3, reps: 10, restSeconds: 90 },
  { name: "Triceps Rope Pushdown", muscleGroup: "Triceps", sets: 3, reps: 12, restSeconds: 60 },
  { name: "Hammer Curl", muscleGroup: "Biceps", sets: 3, reps: 12, restSeconds: 60 },
  { name: "Plank", muscleGroup: "Core", sets: 3, reps: 45, restSeconds: 60, notes: "seconds" },
];

export function enrichWorkoutPlan(plan: WorkoutPlanSuggestion, hints: ContextHints): WorkoutPlanSuggestion {
  const isAdvanced = (hints.experience ?? "").toLowerCase().includes("advance");
  const longSession = (hints.sessionDuration ?? 60) >= 55;

  const targetMin = isAdvanced || longSession ? 5 : 4;

  const enrichedDays = plan.days.map((day) => {
    if (day.exercises.length >= targetMin) return day;
    const needed = targetMin - day.exercises.length;
    const extra = accessories.slice(0, needed).map((ex, idx) => ({
      ...ex,
      order: (day.exercises.length + idx) || idx,
    }));
    return { ...day, exercises: [...day.exercises, ...extra] };
  });

  return { ...plan, days: enrichedDays };
}
