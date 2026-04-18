import type { MobileWorkoutPlanPayload } from "@fitplus/contracts";
import { apiOk, handleApiError } from "@/lib/api";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { getMobileWorkoutPlanData } from "@/lib/mobile-data";

export async function GET() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const data = await getMobileWorkoutPlanData(sessionUser.id);
    return apiOk<MobileWorkoutPlanPayload>(data);
  } catch (error) {
    return handleApiError(error, "Could not load mobile workouts.");
  }
}
