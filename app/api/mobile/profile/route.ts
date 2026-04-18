import type { MobileProfilePayload } from "@fitplus/contracts";
import { apiOk, handleApiError } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth";
import { getMobileProfileData } from "@/lib/mobile-data";

export async function GET() {
  try {
    const sessionUser = await requireApiAuth();
    const data = await getMobileProfileData(sessionUser.id);
    return apiOk<MobileProfilePayload>(data);
  } catch (error) {
    return handleApiError(error, "Could not load the mobile profile.");
  }
}
