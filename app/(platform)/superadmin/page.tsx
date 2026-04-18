import Link from "next/link";
import { Shield, TrendingUp, UsersRound } from "lucide-react";
import { LineChart } from "@/components/charts/line-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { getSuperAdminDashboardData } from "@/lib/admin";
import { requireSuperAdmin } from "@/lib/auth";

export default async function SuperAdminOverviewPage() {
  await requireSuperAdmin();
  const data = await getSuperAdminDashboardData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-sky-500/20 bg-sky-500/6">
          <CardHeader title="Total users" description="All customer and internal accounts" />
          <p className="text-3xl font-semibold">{data.totals.totalUsers}</p>
          <p className="text-sm text-[var(--color-muted)]">{data.totals.activeUsers} active right now</p>
        </Card>
        <Card className="border-violet-500/20 bg-violet-500/6">
          <CardHeader title="Active last 7 days" description="Current platform engagement" />
          <p className="text-3xl font-semibold">{data.totals.activeLast7Days}</p>
          <p className="text-sm text-[var(--color-muted)]">Users seen recently across the product</p>
        </Card>
        <Card>
          <CardHeader title="Admin roster" description="Internal staff with elevated access" />
          <p className="text-3xl font-semibold">{data.totals.adminCount}</p>
          <p className="text-sm text-[var(--color-muted)]">{data.totals.superAdminCount} superadmins currently active</p>
        </Card>
        <Card>
          <CardHeader title="Billing footprint" description="Subscription and monetization readiness" />
          <p className="text-3xl font-semibold">
            {Object.values(data.subscriptionsByStatus).reduce((total, count) => total + count, 0)}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            {Object.keys(data.subscriptionsByTier).length} plan tiers ·{" "}
            {data.subscriptionsByProvider.STRIPE ?? 0} Stripe-backed subscriptions
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader title="Growth snapshot" description="New user creation over the last six monthly windows" />
          <LineChart
            data={data.growthSeries.map((entry) => ({ label: entry.label, value: entry.users }))}
            color="#60a5fa"
          />
        </Card>

        <Card className="space-y-4">
          <CardHeader title="System health" description="Platform readiness and external dependencies" />
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
              <span>Database</span>
              <Badge variant="success">{data.systemHealth.database}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
              <span>Email delivery</span>
              <Badge variant={data.systemHealth.billingEmailConfigured ? "success" : "warning"}>
                {data.systemHealth.billingEmailConfigured
                  ? `Configured (${data.systemHealth.emailProvider})`
                  : data.systemHealth.emailPreviewMode
                    ? "Preview mode"
                    : "Missing config"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
              <span>Google auth</span>
              <Badge variant={data.systemHealth.authProviders.google ? "success" : "warning"}>
                {data.systemHealth.authProviders.google ? "Ready" : "Missing env"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
              <span>Apple auth</span>
              <Badge variant={data.systemHealth.authProviders.apple ? "success" : "warning"}>
                {data.systemHealth.authProviders.apple ? "Ready" : "Missing env"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
              <span>Stripe billing</span>
              <Badge variant={data.systemHealth.stripeConfigured ? "success" : "warning"}>
                {data.systemHealth.stripeConfigured ? "Configured" : "Missing keys"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-3">
              <span>Stripe webhook</span>
              <Badge variant={data.systemHealth.stripeWebhookConfigured ? "success" : "warning"}>
                {data.systemHealth.stripeWebhookConfigured ? "Configured" : "Missing webhook secret"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <CardHeader title="Admin roster" description="Internal operators with company-level access" />
          <div className="space-y-3">
            {data.adminRoster.map((admin) => (
              <div key={admin.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{admin.name ?? "Unnamed admin"}</p>
                    <p className="text-sm text-[var(--color-muted)]">{admin.email}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Last seen {admin.lastSeenAt?.toLocaleString() ?? "never"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{admin.role}</Badge>
                    <Badge variant={admin.status === "ACTIVE" ? "success" : "warning"}>{admin.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="secondary" asChild>
              <Link href="/superadmin/admins">Open admin management</Link>
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <CardHeader title="Recent platform events" description="Founder-level view across auth, admin, and system actions" />
          <div className="space-y-3">
            {data.recentSecurityEvents.map((log) => (
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4">
          <CardHeader title="Growth" description="Company-level usage visibility" />
          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-sky-300" />
                <div>
                  <p className="font-semibold">User growth</p>
                  <p className="text-sm text-[var(--color-muted)]">Track account creation velocity across the last 180 days.</p>
                </div>
              </div>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/superadmin/security">Open security + audit</Link>
            </Button>
          </div>
        </Card>
        <Card className="space-y-4">
          <CardHeader title="Roles" description="Operator oversight and access control" />
          <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-indigo-300" />
              <div>
                <p className="font-semibold">Admin management</p>
                <p className="text-sm text-[var(--color-muted)]">Review and adjust admin vs superadmin access safely.</p>
              </div>
            </div>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/superadmin/admins">Open admin roster</Link>
          </Button>
        </Card>
        <Card className="space-y-4">
          <CardHeader title="Configuration" description="Core platform settings and policy controls" />
          <div className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-violet-300" />
              <div>
                <p className="font-semibold">Platform settings</p>
                <p className="text-sm text-[var(--color-muted)]">Control self-signup, support endpoints, and billing mode.</p>
              </div>
            </div>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/superadmin/settings">Open settings</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
