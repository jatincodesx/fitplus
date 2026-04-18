import { InternalShell, type InternalShellLink } from "@/components/layout/internal-shell";
import { requireSuperAdmin } from "@/lib/auth";
import { getSuperAdminConsoleSummary } from "@/lib/admin";

const navLinks: InternalShellLink[] = [
  { href: "/superadmin", label: "Platform overview", iconName: "activity" },
  { href: "/superadmin/admins", label: "Admin roster", iconName: "usersRound" },
  { href: "/superadmin/security", label: "Audit + security", iconName: "shieldCheck" },
  { href: "/superadmin/settings", label: "Platform settings", iconName: "slidersHorizontal" },
];

const routeMeta = {
  "/superadmin": { eyebrow: "Platform", title: "Overview" },
  "/superadmin/admins": { eyebrow: "Platform", title: "Admin roster" },
  "/superadmin/security": { eyebrow: "Platform", title: "Audit + security" },
  "/superadmin/settings": { eyebrow: "Platform", title: "Platform settings" },
};

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  const summary = await getSuperAdminConsoleSummary();

  return (
    <InternalShell
      navLinks={navLinks}
      routeMeta={routeMeta}
      areaLabel="Founder control"
      areaTitle="Platform Console"
      areaDescription="CEO-level visibility across growth, operators, security, billing readiness, and company configuration."
      summary={summary}
      switchLink={{ href: "/dashboard", label: "Open customer app" }}
      accentClassName="bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600"
    >
      {children}
    </InternalShell>
  );
}
