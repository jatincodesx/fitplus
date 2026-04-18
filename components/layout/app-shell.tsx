"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Brain,
  Calendar,
  ChartLine,
  CreditCard,
  Dumbbell,
  LogOut,
  MessageCircle,
  PhoneCall,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/dashboard", label: "Overview", icon: ChartLine },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { href: "/progress", label: "Progress", icon: Calendar },
  { href: "/coach", label: "AI Coach", icon: Brain },
  { href: "/coach-call", label: "Coach Chat", icon: PhoneCall },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

const routeMeta: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard": { eyebrow: "Performance", title: "Dashboard" },
  "/profile": { eyebrow: "Account", title: "Profile" },
  "/workouts": { eyebrow: "Training", title: "Workouts" },
  "/nutrition": { eyebrow: "Fuel", title: "Nutrition" },
  "/progress": { eyebrow: "Progress", title: "Progress" },
  "/coach": { eyebrow: "Coaching", title: "AI Coach" },
  "/coach-call": { eyebrow: "Coaching", title: "Coach Session" },
  "/billing": { eyebrow: "Account", title: "Billing" },
  "/admin": { eyebrow: "Platform", title: "Admin" },
};

export type AppShellSummary = {
  title: string;
  detail: string;
  ctaHref: string;
  ctaLabel: string;
};

export function AppShell({
  children,
  shellSummary,
  needsEmailVerification = false,
}: {
  children: React.ReactNode;
  shellSummary?: AppShellSummary;
  needsEmailVerification?: boolean;
}) {
  const pathname = usePathname();
  const session = useSession();

  const activeMeta =
    Object.entries(routeMeta).find(([href]) => pathname.startsWith(href))?.[1] ??
    routeMeta["/dashboard"];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-transparent text-foreground lg:grid-cols-[292px_1fr]">
      <aside className="border-r border-[var(--color-border)]/60 bg-black/20 px-4 py-6 backdrop-blur">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-lg font-black text-white">
            FP
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">FitPilot AI</p>
            <p className="text-lg font-semibold">Coaching Studio</p>
          </div>
        </div>

        <nav className="space-y-1">
          {baseLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-white/5",
                  active && "bg-white/10 text-white"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-2xl border border-[var(--color-border)]/70 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Live Focus</p>
          <p className="mt-2 text-base font-semibold">
            {shellSummary?.title ?? "Consistency + Recovery"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {shellSummary?.detail ?? "Adaptive training is ready once your profile and first plan are in place."}
          </p>
          <Button variant="secondary" size="sm" className="mt-4 w-full" asChild>
            <Link href={shellSummary?.ctaHref ?? "/onboarding"}>
              {shellSummary?.ctaLabel ?? "Edit onboarding"}
            </Link>
          </Button>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col bg-transparent">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)]/60 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{activeMeta.eyebrow}</p>
            <h1 className="text-xl font-semibold">{activeMeta.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session.data?.user?.role === "SUPERADMIN" ? (
              <Link
                href="/superadmin"
                className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-2)] lg:flex"
              >
                Platform console
              </Link>
            ) : null}
            <Link
              href="/coach"
              className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] md:flex"
            >
              <MessageCircle className="h-4 w-4" /> Ask coach
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2">
              <Avatar src={session.data?.user?.image} name={session.data?.user?.name} className="h-8 w-8" />
              <div className="hidden text-left text-sm md:block">
                <p className="font-semibold leading-tight">{session.data?.user?.name ?? "Athlete"}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{session.data?.user?.email}</p>
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

        {needsEmailVerification ? (
          <div className="border-b border-amber-400/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-100">
            Email verification is still pending. Some security actions may stay limited until you verify your address.
            {" "}
            <Link href="/profile" className="font-semibold underline underline-offset-4">
              Open account settings
            </Link>
          </div>
        ) : null}

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
