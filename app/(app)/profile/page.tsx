import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AccountSettingsPanels } from "@/components/account/account-settings-panels";
import { getAvailableAuthProviders, requireCustomerAppAccess } from "@/lib/auth";
import { getProfileRenderData } from "@/lib/profile-data";

function logProfilePage(event: string, metadata?: Record<string, unknown>) {
  if (process.env.AUTH_DEBUG !== "true") {
    return;
  }

  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[profile-page] ${event}${payload}`);
}

export default async function ProfilePage() {
  logProfilePage("start");
  const sessionUser = await requireCustomerAppAccess();
  logProfilePage("session-user", { userId: sessionUser.id, role: sessionUser.role });

  logProfilePage("render-data-start", { userId: sessionUser.id });
  let user: Awaited<ReturnType<typeof getProfileRenderData>>["user"] = null;
  let workoutSummary: Awaited<ReturnType<typeof getProfileRenderData>>["workoutSummary"] = {
    plan: null,
    completedDays: 0,
    totalDays: 0,
    nextWorkout: null,
  };
  let loadFailed = false;

  try {
    const data = await getProfileRenderData(sessionUser.id);
    user = data.user;
    workoutSummary = data.workoutSummary;
    logProfilePage("render-data-done", {
      userId: sessionUser.id,
      found: Boolean(user),
      hasPlan: Boolean(workoutSummary.plan),
    });
  } catch (error) {
    loadFailed = true;
    console.error("[profile-page-error]", {
      userId: sessionUser.id,
      error: error instanceof Error ? error.message : "UnknownError",
    });
  }

  if (!user && !loadFailed) {
    redirect("/sign-in");
  }

  const availableProviders = getAvailableAuthProviders();

  if (loadFailed || !user) {
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
              <Link href="/onboarding" prefetch={false}>Edit onboarding</Link>
            </Button>
            <Button asChild>
              <Link href="/coach-call" prefetch={false}>Run coach session</Link>
            </Button>
          </div>
        </div>

        <Card className="border-amber-400/30 bg-amber-500/10">
          <CardHeader title="Profile data could not load" description="The rest of the app is still available." />
          <p className="text-sm text-amber-100">
            Refresh this page to retry. If the problem persists, use onboarding or coach chat to keep working.
          </p>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader title="Account" description="Fallback session state" />
            <div className="space-y-2 text-sm text-[var(--color-muted)]">
              <p><span className="font-semibold text-foreground">Name:</span> {sessionUser.name ?? "Athlete"}</p>
              <p><span className="font-semibold text-foreground">Email:</span> {sessionUser.email}</p>
              <p><span className="font-semibold text-foreground">Role:</span> {sessionUser.role}</p>
              <p><span className="font-semibold text-foreground">Verification:</span> {sessionUser.emailVerified ? "Verified" : "Pending"}</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Training profile" description="Temporary fallback state" />
            <p className="text-sm text-[var(--color-muted)]">
              Detailed profile data is temporarily unavailable.
            </p>
          </Card>

          <Card>
            <CardHeader title="Connected providers" description="Available sign-in methods" />
            <div className="space-y-2 text-sm text-[var(--color-muted)]">
              <p><span className="font-semibold text-foreground">Password:</span> Available</p>
              <p><span className="font-semibold text-foreground">Google:</span> {availableProviders.google ? "Available" : "Not configured"}</p>
              <p><span className="font-semibold text-foreground">Apple:</span> {availableProviders.apple ? "Available" : "Not configured"}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
            <Link href="/onboarding" prefetch={false}>Edit onboarding</Link>
          </Button>
          <Button asChild>
            <Link href="/coach-call" prefetch={false}>Run coach session</Link>
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
              {workoutSummary.nextWorkout?.name ?? "No active plan"}
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
          description={workoutSummary.plan?.title ?? "No active workout plan"}
        />
        {workoutSummary.plan ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 text-sm text-[var(--color-muted)]">
              <p>{workoutSummary.plan.summary}</p>
              <p>
                <span className="font-semibold text-foreground">Weekly completion:</span>{" "}
                {workoutSummary.completedDays}/{workoutSummary.totalDays} days complete
              </p>
              <p>
                <span className="font-semibold text-foreground">Current split:</span>{" "}
                {workoutSummary.plan.split ?? "Structured weekly plan"}
              </p>
            </div>
            <div className="space-y-2">
              {workoutSummary.plan.days.map((day) => (
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
