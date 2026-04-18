import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDefaultAppPath } from "@/lib/role-routing";

export default async function AuthCompletePage() {
  const sessionUser = await requireAuth();
  redirect(getDefaultAppPath(sessionUser.role));
}
