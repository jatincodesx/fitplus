import type { MobileCoachFeedPayload } from "@fitplus/contracts";
import { apiOk, handleApiError } from "@/lib/api";
import { requireApiCustomerAppAccess } from "@/lib/auth";
import { getMobileCoachFeed } from "@/lib/mobile-data";

export async function GET() {
  try {
    const sessionUser = await requireApiCustomerAppAccess();
    const data = await getMobileCoachFeed(sessionUser.id);
    return apiOk<MobileCoachFeedPayload>(data);
  } catch (error) {
    return handleApiError(error, "Could not load mobile coach messages.");
  }
}
