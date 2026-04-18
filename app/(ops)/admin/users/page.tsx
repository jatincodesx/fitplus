import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listManagedUsers } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { adminUserFiltersSchema } from "@/lib/schemas/admin";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const rawParams = await searchParams;
  const parsed = adminUserFiltersSchema.safeParse(rawParams);
  const filters = parsed.success ? parsed.data : { page: 1 };
  const data = await listManagedUsers(filters);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <CardHeader
          title="User directory"
          description="Search customers by identity, lifecycle state, or current access role"
        />
        <form className="grid gap-3 md:grid-cols-4">
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="Search email or name" />
          <Select name="role" defaultValue={filters.role ?? ""}>
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPERADMIN">Superadmin</option>
          </Select>
          <Select name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
            <option value="DELETED">Deleted</option>
          </Select>
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <CardHeader title="Account reviews" description={`${data.total} users returned`} />
        <div className="space-y-3">
          {data.users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold">{user.name ?? "Unnamed user"}</p>
                  <p className="text-sm text-[var(--color-muted)]">{user.email}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Profile completion {user.profileCompletion}% · {user._count.sessions} sessions · {user._count.workoutPlans} plans
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{user.role}</Badge>
                  <Badge
                    variant={
                      user.status === "ACTIVE"
                        ? "success"
                        : user.status === "SUSPENDED" || user.status === "DELETED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {user.status}
                  </Badge>
                  <Badge variant="warning">{user.subscription?.planTier ?? "STARTER"}</Badge>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/admin/users/${user.id}`}>Review</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-muted)]">
            Page {data.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/admin/users?page=${data.page - 1}`}>Previous</Link>
              </Button>
            ) : null}
            {data.page < totalPages ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/admin/users?page=${data.page + 1}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
