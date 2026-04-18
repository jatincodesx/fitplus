import { OnboardingForm } from "@/components/onboarding-form";
import { Card } from "@/components/ui/card";
import { requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { onboardingSchema } from "@/lib/validators";

type OnboardingDefaults = Partial<z.output<typeof onboardingSchema>>;

export default async function OnboardingPage() {
  const sessionUser = await requireCustomerAppAccess();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { profile: true },
  });

  const defaults: OnboardingDefaults | undefined = user?.profile
    ? {
        age: user.profile.age ?? undefined,
        sex: user.profile.sex ?? undefined,
        heightCm: user.profile.heightCm ?? undefined,
        weightKg: user.profile.weightKg ?? undefined,
        goalType: user.profile.goalType ?? undefined,
        currentGoal: user.profile.currentGoal ?? undefined,
        experienceLevel: user.profile.experienceLevel ?? undefined,
        trainingLocation: user.profile.trainingLocation ?? undefined,
        availableEquipment: user.profile.availableEquipment ?? undefined,
        injuries: user.profile.injuries ?? undefined,
        trainingDaysPerWeek: user.profile.trainingDaysPerWeek ?? undefined,
        sessionDurationMins: user.profile.sessionDurationMins ?? undefined,
        dietaryPreference: user.profile.dietaryPreference ?? undefined,
      }
    : undefined;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Onboarding</p>
        <h1 className="text-3xl font-semibold">Personalize your training</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Tell FitPilot about your body, goal, schedule, and constraints. You can update this anytime.
        </p>
        <div className="mt-3">
          <Button variant="secondary" asChild>
            <Link href="/coach-call">Coach Chat Session</Link>
          </Button>
        </div>
      </div>
      <Card>
        <OnboardingForm defaults={defaults} />
      </Card>
    </div>
  );
}
