import type { MobileNutritionPayload } from "@fitplus/contracts";
import { apiOk, handleApiError } from "@/lib/api";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { getMobileNutritionData } from "@/lib/mobile-data";

export async function GET() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const data = await getMobileNutritionData(sessionUser.id);
    return apiOk<MobileNutritionPayload>(data);
  } catch (error) {
    return handleApiError(error, "Could not load mobile nutrition.");
  }
}
