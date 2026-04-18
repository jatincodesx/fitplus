import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getOperationsAuditLogs } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const logs = await getOperationsAuditLogs(q);

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <CardHeader
          title="Operational audit feed"
          description="Search user lifecycle, authentication, and internal support actions"
        />
        <form className="flex flex-wrap gap-3">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search audit events" className="max-w-md" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="Recent events" description={`${logs.length} events in view`} />
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
