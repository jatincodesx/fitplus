import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserManagementActions } from "@/components/admin/user-management-actions";
import { getManagedUserDetails } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const sessionUser = await requireAdmin();
  const { userId } = await params;

  let data;
  try {
    data = await getManagedUserDetails(userId);
  } catch {
    notFound();
  }

  const user = data.user;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-4 xl:col-span-2">
          <CardHeader
            title="Customer account review"
            description="Identity, account state, linked auth methods, and recent product activity"
          />
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <p><span className="font-semibold text-foreground">Name:</span> {user.name ?? "Unnamed user"}</p>
            <p><span className="font-semibold text-foreground">Email:</span> {user.email}</p>
            <p><span className="font-semibold text-foreground">Role:</span> {user.role}</p>
            <p><span className="font-semibold text-foreground">Status:</span> {user.status}</p>
            <p><span className="font-semibold text-foreground">Email verified:</span> {user.emailVerified ? "Yes" : "No"}</p>
            <p><span className="font-semibold text-foreground">Last login:</span> {user.lastLoginAt?.toLocaleString() ?? "Never"}</p>
            <p><span className="font-semibold text-foreground">Profile completion:</span> {user.profileCompletion}%</p>
            <p><span className="font-semibold text-foreground">Subscription:</span> {user.subscription?.plan ?? "Starter"} / {user.subscription?.status ?? "ACTIVE"}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Linked providers</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={user.password ? "success" : "warning"}>{user.password ? "Password" : "No password"}</Badge>
                {user.accounts.map((account) => (
                  <Badge key={account.id}>{account.provider}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Recent workout</p>
              <p className="mt-3 text-sm">{data.latestWorkoutSession?.dayName ?? "No recent workout"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Coach activity</p>
              <p className="mt-3 text-sm">{data.latestCoachSession?.summary ?? "No recent coach session"}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <CardHeader title="Operational actions" description="Access control, support emails, and session revocation" />
          <UserManagementActions
            userId={user.id}
            currentRole={user.role}
            currentStatus={user.status}
            emailVerified={Boolean(user.emailVerified)}
            viewerRole={sessionUser.role}
          />
        </Card>
      </div>

      <Card className="space-y-4">
        <CardHeader title="Tracked sessions" description={`${user.sessions.length} currently tracked sessions`} />
        <div className="space-y-3">
          {user.sessions.map((session) => (
            <div key={session.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{session.userAgent ?? "Unknown device"}</p>
                  <p className="text-[var(--color-muted)]">{session.ipAddress ?? "IP unavailable"}</p>
                </div>
                <p className="text-[var(--color-muted)]">Expires {session.expires.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="Customer audit trail" description="Support-relevant history for this account" />
        <div className="space-y-3">
          {data.recentAuditLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{log.eventType}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    Actor: {log.actorUser?.email ?? "system"} · Target: {log.targetUser?.email ?? "n/a"}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-muted)]">{log.createdAt.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
