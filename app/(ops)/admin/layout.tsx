import { InternalShell, type InternalShellLink } from "@/components/layout/internal-shell";
import { requireAdmin } from "@/lib/auth";
import { getAdminConsoleSummary } from "@/lib/admin";

const baseNavLinks: InternalShellLink[] = [
  { href: "/admin", label: "Operations overview", iconName: "layoutDashboard" },
  { href: "/admin/users", label: "User management", iconName: "users" },
  { href: "/admin/audit", label: "Operational audit", iconName: "shieldAlert" },
];

const superAdminSettingsLink: InternalShellLink = {
  href: "/admin/settings",
  label: "Platform settings",
  iconName: "clipboardList",
};

const routeMeta = {
  "/admin": { eyebrow: "Operations", title: "Overview" },
  "/admin/users": { eyebrow: "Operations", title: "User management" },
  "/admin/audit": { eyebrow: "Operations", title: "Operational audit" },
  "/admin/settings": { eyebrow: "Operations", title: "Settings redirect" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireAdmin();
  const summary = await getAdminConsoleSummary();
  const navLinks: InternalShellLink[] =
    sessionUser.role === "SUPERADMIN"
      ? [...baseNavLinks, superAdminSettingsLink]
      : baseNavLinks;

  return (
    <InternalShell
      navLinks={navLinks}
      routeMeta={routeMeta}
      areaLabel="Internal operations"
      areaTitle="Operations Console"
      areaDescription="Customer support, lifecycle review, and operational controls for internal staff."
      summary={summary}
      switchLink={
        sessionUser.role === "SUPERADMIN"
          ? {
              href: "/superadmin",
              label: "Open platform console",
            }
          : undefined
      }
      accentClassName="bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-600"
    >
      {children}
    </InternalShell>
  );
}
