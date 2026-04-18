import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { listAdminRoster } from "@/lib/admin";
import { requireSuperAdmin } from "@/lib/auth";

export default async function SuperAdminAdminsPage() {
  await requireSuperAdmin();
  const roster = await listAdminRoster();

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <CardHeader
          title="Admin roster"
          description="Promote, demote, and review internal operators from a founder-level surface"
        />
        <div className="space-y-3">
          {roster.map((user) => (
            <div key={user.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{user.name ?? "Unnamed team member"}</p>
                  <p className="text-sm text-[var(--color-muted)]">{user.email}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Added {user.createdAt.toLocaleDateString()} · last seen {user.lastSeenAt?.toLocaleString() ?? "never"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{user.role}</Badge>
                  <Badge variant={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/admin/users/${user.id}`}>Manage role</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
