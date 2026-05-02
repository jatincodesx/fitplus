import "server-only";

import { getWorkoutPlanProgress } from "@/lib/workout-progress";

export async function getWorkoutsPageData(userId: string) {
  return getWorkoutPlanProgress(userId);
}
