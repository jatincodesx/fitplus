import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AccountSettingsPanels } from "@/components/account/account-settings-panels";
import { getAvailableAuthProviders, requireCustomerAppAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkoutPlanProgress } from "@/lib/workout-progress";

export default async function ProfilePage() {
  const sessionUser = await requireCustomerAppAccess();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profile: true,
      subscription: true,
      billingProfile: true,
      accounts: { orderBy: { provider: "asc" } },
      sessions: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const workoutProgress = await getWorkoutPlanProgress(user.id);
  const availableProviders = getAvailableAuthProviders();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Profile</p>
          <h1 className="text-3xl font-semibold">Your training profile</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Keep your body metrics, schedule, and constraints sharp so coaching and generation stay credible.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link href="/onboarding">Edit onboarding</Link>
          </Button>
          <Button asChild>
            <Link href="/coach-call">Run coach session</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Account" description="Basics" />
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p><span className="font-semibold text-foreground">Name:</span> {user.name ?? "Athlete"}</p>
            <p><span className="font-semibold text-foreground">Email:</span> {user.email}</p>
            <p><span className="font-semibold text-foreground">Role:</span> {user.role ?? "USER"}</p>
            <p><span className="font-semibold text-foreground">Verification:</span> {user.emailVerified ? "Verified" : "Pending"}</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Training profile" description="What the AI is currently using" />
          <div className="grid gap-2 text-sm text-[var(--color-muted)]">
            <p><span className="font-semibold text-foreground">Goal:</span> {user.profile?.currentGoal ?? user.profile?.goalType ?? "Not set"}</p>
            <p><span className="font-semibold text-foreground">Experience:</span> {user.profile?.experienceLevel ?? "Not set"}</p>
            <p><span className="font-semibold text-foreground">Schedule:</span> {user.profile?.trainingDaysPerWeek ?? "—"} days · {user.profile?.sessionDurationMins ?? "—"} min</p>
            <p><span className="font-semibold text-foreground">Location:</span> {user.profile?.trainingLocation ?? "Not set"}</p>
            <p><span className="font-semibold text-foreground">Equipment:</span> {user.profile?.availableEquipment ?? "Not set"}</p>
            <p><span className="font-semibold text-foreground">Limitations:</span> {user.profile?.injuries ?? "None noted"}</p>
            <p><span className="font-semibold text-foreground">Nutrition:</span> {user.profile?.dietaryPreference ?? "Balanced"}</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Subscription" description="Billing-ready account state" />
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p><span className="font-semibold text-foreground">Plan:</span> {user.subscription?.plan ?? "Starter"}</p>
            <p><span className="font-semibold text-foreground">Status:</span> {user.subscription?.status ?? "ACTIVE"}</p>
            <p><span className="font-semibold text-foreground">Tier:</span> {user.subscription?.planTier ?? "STARTER"}</p>
            <p>
              <span className="font-semibold text-foreground">Next workout:</span>{" "}
              {workoutProgress.nextWorkout?.name ?? "No active plan"}
            </p>
          </div>
        </Card>
      </div>

      <AccountSettingsPanels
        name={user.name ?? ""}
        email={user.email}
        emailVerified={Boolean(user.emailVerified)}
        hasPassword={Boolean(user.password)}
        linkedAccounts={user.accounts.map((account) => ({
          id: account.id,
          provider: account.provider,
          createdAt: account.createdAt.toISOString(),
        }))}
        sessions={user.sessions.map((session) => ({
          id: session.id,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          updatedAt: session.updatedAt.toISOString(),
          expires: session.expires.toISOString(),
          isCurrent: session.sessionToken === sessionUser.sessionId,
        }))}
        availableProviders={availableProviders}
      />

      <Card>
        <CardHeader
          title="Connected plan state"
          description={workoutProgress.plan?.title ?? "No active workout plan"}
        />
        {workoutProgress.plan ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 text-sm text-[var(--color-muted)]">
              <p>{workoutProgress.plan.summary}</p>
              <p>
                <span className="font-semibold text-foreground">Weekly completion:</span>{" "}
                {workoutProgress.completedDays}/{workoutProgress.totalDays} days complete
              </p>
              <p>
                <span className="font-semibold text-foreground">Current split:</span>{" "}
                {workoutProgress.plan.split ?? "Structured weekly plan"}
              </p>
            </div>
            <div className="space-y-2">
              {workoutProgress.plan.days.slice(0, 3).map((day) => (
                <div
                  key={day.id}
                  className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3 text-sm text-[var(--color-muted)]"
                >
                  <p className="font-semibold text-foreground">{day.name}</p>
                  <p>{day.focus}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Generate a workout plan to populate the connected training state here.
          </p>
        )}
      </Card>
    </div>
  );
}
