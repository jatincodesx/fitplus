import type { MobileDashboardPayload } from "@fitplus/contracts";
import { apiOk, handleApiError } from "@/lib/api";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { getMobileDashboardData } from "@/lib/mobile-data";

export async function GET() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const data = await getMobileDashboardData(sessionUser.id);
    return apiOk<MobileDashboardPayload>(data);
  } catch (error) {
    return handleApiError(error, "Could not load the mobile dashboard.");
  }
}
