import Link from "next/link";
import { AlertTriangle, Clock3, LifeBuoy, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { requireAdmin } from "@/lib/auth";
import { getAdminOperationsDashboardData } from "@/lib/admin";

export default async function AdminOverviewPage() {
  const sessionUser = await requireAdmin();
  const data = await getAdminOperationsDashboardData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-500/20 bg-emerald-500/6">
          <CardHeader title="Managed users" description="All customer accounts in scope" />
          <p className="text-3xl font-semibold">{data.totals.totalUsers}</p>
          <p className="text-sm text-[var(--color-muted)]">{data.totals.activeUsers} currently active</p>
        </Card>
        <Card className="border-amber-400/20 bg-amber-400/6">
          <CardHeader title="Flagged accounts" description="Suspended or waiting for intervention" />
          <p className="text-3xl font-semibold">{data.totals.suspendedUsers}</p>
          <p className="text-sm text-[var(--color-muted)]">{data.totals.deletionRequests} deletion requests pending review</p>
        </Card>
        <Card>
          <CardHeader title="Recent signups" description="Last 7 days" />
          <p className="text-3xl font-semibold">{data.totals.recentSignups}</p>
          <p className="text-sm text-[var(--color-muted)]">{data.totals.invitedUsers} invited accounts still not activated</p>
        </Card>
        <Card>
          <CardHeader title="Verification queue" description="Accounts still not verified" />
          <p className="text-3xl font-semibold">{data.totals.pendingVerification}</p>
          <p className="text-sm text-[var(--color-muted)]">{data.totals.recentSessions} tracked active sessions over 30 days</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <CardHeader
            title="Support actions"
            description="Internal tools for onboarding, account review, and lifecycle support"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-[var(--color-accent-2)]" />
                <div>
                  <p className="font-semibold">Invite a customer</p>
                  <p className="text-sm text-[var(--color-muted)]">Create controlled access without manual database work.</p>
                </div>
              </div>
              <div className="mt-4">
                <InviteUserForm actorRole={sessionUser.role} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                  <div>
                    <p className="font-semibold">Flagged accounts</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      Review suspended users, deletion requests, and unverified signups.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="mt-4" asChild>
                  <Link href="/admin/users?status=SUSPENDED">Review flagged users</Link>
                </Button>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <LifeBuoy className="h-5 w-5 text-[var(--color-accent)]" />
                  <div>
                    <p className="font-semibold">Operational audit</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      Inspect staff actions and account events relevant to support and operations.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="mt-4" asChild>
                  <Link href="/admin/audit">Open audit feed</Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <CardHeader title="Newest customers" description="Fresh accounts that may need onboarding help" />
          <div className="space-y-3">
            {data.recentUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{user.name ?? "Unnamed user"}</p>
                    <p className="text-sm text-[var(--color-muted)]">{user.email}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Created {user.createdAt.toLocaleDateString()} · onboarding{" "}
                      {user.onboardingCompletedAt ? "complete" : "pending"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <CardHeader title="Recent admin actions" description="Latest internal actions affecting customer accounts" />
        <div className="grid gap-3 lg:grid-cols-2">
          {data.recentAdminActions.map((log) => (
            <div key={log.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{log.eventType}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    Actor: {log.actorUser?.email ?? "system"} · Target: {log.targetUser?.email ?? "n/a"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {log.createdAt.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
