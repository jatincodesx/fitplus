import type { MobileWorkoutDayPayload } from "@fitplus/contracts";
import { apiOk, ApiError, handleApiError } from "@/lib/api";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { getMobileWorkoutDayData } from "@/lib/mobile-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dayId: string }> }
) {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const { dayId } = await params;
    const data = await getMobileWorkoutDayData(sessionUser.id, dayId);

    if (!data) {
      throw new ApiError(404, "Workout day not found.");
    }

    return apiOk<MobileWorkoutDayPayload>(data);
  } catch (error) {
    return handleApiError(error, "Could not load that workout day.");
  }
}
