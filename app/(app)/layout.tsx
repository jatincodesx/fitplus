import { ReactNode } from "react";
import { AppShell, type AppShellSummary } from "@/components/layout/app-shell";
import { requireCustomerAppAccess } from "@/lib/auth";

function logDashboardLayout(event: string, metadata?: Record<string, unknown>) {
  if (process.env.AUTH_DEBUG !== "true") {
    return;
  }

  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[dashboard-layout] ${event}${payload}`);
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  logDashboardLayout("start");
  const sessionUser = await requireCustomerAppAccess();
  logDashboardLayout("session-user", { userId: sessionUser.id, role: sessionUser.role });
  const shellSummary: AppShellSummary = sessionUser.emailVerified
    ? {
        title: sessionUser.name ?? "Consistency + Recovery",
        detail: "Pick your next move across dashboard, profile, workouts, nutrition, coach, and billing.",
        ctaHref: "/dashboard",
        ctaLabel: "Open dashboard",
      }
    : {
        title: "Verify your account",
        detail: "Email verification is still pending, so security-sensitive account actions may stay limited until you confirm your address.",
        ctaHref: "/profile",
        ctaLabel: "Review account",
      };

  return (
    <AppShell
      viewer={sessionUser}
      shellSummary={shellSummary}
      needsEmailVerification={!sessionUser.emailVerified}
    >
      {children}
    </AppShell>
  );
}
