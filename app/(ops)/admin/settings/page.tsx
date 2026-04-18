import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function AdminSettingsRedirectPage() {
  const sessionUser = await requireAdmin();

  if (sessionUser.role === "SUPERADMIN") {
    redirect("/superadmin/settings");
  }

  redirect("/admin");
}
