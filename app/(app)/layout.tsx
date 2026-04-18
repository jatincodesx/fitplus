import { ReactNode } from "react";
import { AppShell, type AppShellSummary } from "@/components/layout/app-shell";
import { requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkoutPlanProgress } from "@/lib/workout-progress";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sessionUser = await requireCustomerAppAccess();
  let shellSummary: AppShellSummary | undefined;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { profile: true },
  });

  if (user) {
    const workoutProgress = await getWorkoutPlanProgress(user.id);
    const nextWorkout = workoutProgress.nextWorkout;

    shellSummary = {
      title:
        nextWorkout?.name ??
        workoutProgress.plan?.split ??
        user.profile?.currentGoal ??
        "Consistency + Recovery",
      detail: workoutProgress.plan
        ? `${workoutProgress.completedDays}/${workoutProgress.totalDays} workout days complete this week`
        : "Generate a plan to activate live coaching and workout execution.",
      ctaHref: nextWorkout ? `/workouts/${nextWorkout.id}` : "/onboarding",
      ctaLabel: nextWorkout
        ? nextWorkout.status === "in_progress"
          ? "Resume session"
          : "Start next workout"
        : "Edit onboarding",
    };
  }

  return (
    <AppShell
      shellSummary={shellSummary}
      needsEmailVerification={!sessionUser.emailVerified}
    >
      {children}
    </AppShell>
  );
}
