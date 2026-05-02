"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRightLeft,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UsersRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const internalShellIconMap = {
  activity: Activity,
  usersRound: UsersRound,
  shieldCheck: ShieldCheck,
  slidersHorizontal: SlidersHorizontal,
  layoutDashboard: LayoutDashboard,
  users: Users,
  shieldAlert: ShieldAlert,
  clipboardList: ClipboardList,
} satisfies Record<string, LucideIcon>;

export type InternalShellIconName = keyof typeof internalShellIconMap;

export type InternalShellLink = {
  href: string;
  label: string;
  iconName: InternalShellIconName;
};

export type InternalShellSummary = {
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

type InternalShellViewer = {
  name?: string | null;
  email: string;
  image?: string | null;
};

export function InternalShell({
  children,
  viewer,
  navLinks,
  routeMeta,
  areaLabel,
  areaTitle,
  areaDescription,
  summary,
  switchLink,
  accentClassName,
}: {
  children: React.ReactNode;
  viewer: InternalShellViewer;
  navLinks: InternalShellLink[];
  routeMeta: Record<string, { eyebrow: string; title: string }>;
  areaLabel: string;
  areaTitle: string;
  areaDescription: string;
  summary: InternalShellSummary;
  switchLink?: { href: string; label: string };
  accentClassName: string;
}) {
  const pathname = usePathname();

  const matchesRoutePrefix = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const fallbackMeta =
    routeMeta[navLinks[0]?.href ?? ""] ?? Object.values(routeMeta)[0] ?? { eyebrow: areaLabel, title: areaTitle };

  const activeMeta =
    Object.entries(routeMeta)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([href]) => matchesRoutePrefix(href))?.[1] ?? fallbackMeta;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-transparent text-foreground lg:grid-cols-[312px_1fr]">
      <aside className="border-r border-[var(--color-border)]/60 bg-slate-950/60 px-5 py-6 backdrop-blur-xl">
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black text-white shadow-lg",
                accentClassName
              )}
            >
              FP
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{areaLabel}</p>
              <p className="text-lg font-semibold">{areaTitle}</p>
            </div>
          </div>
          <p className="text-sm text-[var(--color-muted)]">{areaDescription}</p>
        </div>

        <nav className="space-y-1">
          {navLinks.map((link) => {
            const active = matchesRoutePrefix(link.href);
            const Icon = internalShellIconMap[link.iconName];

            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition hover:bg-white/5",
                  active && "bg-white/10 text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-3xl border border-[var(--color-border)]/70 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Live brief</p>
          <p className="mt-3 text-lg font-semibold">{summary.title}</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{summary.detail}</p>
          {summary.actionHref && summary.actionLabel ? (
            <Button variant="secondary" size="sm" className="mt-4 w-full" asChild>
              <Link href={summary.actionHref} prefetch={false}>{summary.actionLabel}</Link>
            </Button>
          ) : null}
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)]/60 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{activeMeta.eyebrow}</p>
            <h1 className="text-2xl font-semibold">{activeMeta.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {switchLink ? (
              <Link
                href={switchLink.href}
                prefetch={false}
                className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-2)] lg:flex"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {switchLink.label}
              </Link>
            ) : null}
            <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2">
              <Avatar src={viewer.image} name={viewer.name} className="h-8 w-8" />
              <div className="hidden text-left text-sm md:block">
                <p className="font-semibold leading-tight">{viewer.name ?? "Team member"}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{viewer.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-white/5"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
