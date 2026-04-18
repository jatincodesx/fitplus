import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPlatformAuditLogs, getSuperAdminDashboardData } from "@/lib/admin";
import { requireSuperAdmin } from "@/lib/auth";

export default async function SuperAdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q } = await searchParams;
  const [logs, overview] = await Promise.all([getPlatformAuditLogs(q), getSuperAdminDashboardData()]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Auth providers" description="External identity readiness" />
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p>Google: {overview.systemHealth.authProviders.google ? "configured" : "missing env"}</p>
            <p>Apple: {overview.systemHealth.authProviders.apple ? "configured" : "missing env"}</p>
            <p>Password: enabled</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Billing visibility" description="Outbound comms and billing status" />
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p>
              Email delivery: {overview.systemHealth.billingEmailConfigured
                ? `configured (${overview.systemHealth.emailProvider})`
                : overview.systemHealth.emailPreviewMode
                  ? "preview mode"
                  : "missing config"}
            </p>
            <p>Stripe keys: {overview.systemHealth.stripeConfigured ? "configured" : "missing"}</p>
            <p>Stripe webhooks: {overview.systemHealth.stripeWebhookConfigured ? "configured" : "missing"}</p>
            <p>Database: {overview.systemHealth.database}</p>
            <p>AI provider: {overview.systemHealth.aiProvider}</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Security posture" description="Current high-level platform posture" />
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p>{overview.totals.superAdminCount} active superadmins</p>
            <p>{overview.totals.adminCount} active admins</p>
            <p>{overview.totals.activeLast7Days} users seen in the last 7 days</p>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <CardHeader title="Platform audit feed" description="Search every stored audit event across the platform" />
        <form className="flex flex-wrap gap-3">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search audit events or emails" className="max-w-md" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="Audit events" description={`${logs.length} founder-visible events in view`} />
        <div className="space-y-3">
          {logs.map((log) => (
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
              {log.metadata ? <p className="mt-2 text-xs text-[var(--color-muted)]">{log.metadata}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
