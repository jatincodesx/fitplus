import type { MobileProgressPayload } from "@fitplus/contracts";
import { apiOk, handleApiError } from "@/lib/api";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { getMobileProgressData } from "@/lib/mobile-data";

export async function GET() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const data = await getMobileProgressData(sessionUser.id);
    return apiOk<MobileProgressPayload>(data);
  } catch (error) {
    return handleApiError(error, "Could not load mobile progress.");
  }
}
