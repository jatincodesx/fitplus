import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";

const features = [
  {
    title: "AI-Coached Workouts",
    description: "Adaptive splits, warmups, and progressions tailored to your goal.",
  },
  {
    title: "Nutrition Copilot",
    description: "Macro targets, meal ideas, and hydration nudges that respect your preferences.",
  },
  {
    title: "Progress Intelligence",
    description: "Charts for adherence, strength, weight, and readiness—investor-ready.",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "$0",
    desc: "Perfect for demos and early adopters",
    perks: ["Email login", "AI coach chat (local)", "Sample data + templates"],
  },
  {
    name: "Pro",
    price: "$19",
    desc: "For founders validating paid users",
    perks: ["Priority AI throughput", "Advanced analytics", "Export & CSV import"],
  },
  {
    name: "Enterprise",
    price: "Talk to us",
    desc: "Launch-ready with auditability",
    perks: ["Admin roles", "SOC2-ready patterns", "Custom branding"],
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0b0d14] via-[#0f172a] to-[#07080f]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.4),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(34,197,235,0.35),transparent_35%)]" />
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 sm:px-8 sm:py-20">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[var(--color-accent-2)]">
              <Sparkles className="h-4 w-4" />
              Local-first AI + SaaS-ready patterns
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              FitPilot AI is your <span className="text-[var(--color-accent)]">adaptive fitness copilot</span> for founders and athletes.
            </h1>
            <p className="max-w-2xl text-lg text-[var(--color-muted)]">
              Premium landing, onboarding, AI workouts, nutrition, progress intelligence, billing readiness, and admin-friendly schema—all production minded and ready to demo today.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">Create your account</Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <Link href="/dashboard">Launch demo dashboard</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" /> Auth + RBAC ready
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[var(--color-accent-2)]" /> Ollama-first, cloud-switchable
              </div>
            </div>
          </div>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-sm shadow-2xl shadow-purple-500/20 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Preview</p>
            <p className="mt-2 text-2xl font-semibold">FitPilot AI Demo Stack</p>
            <ul className="mt-4 space-y-2 text-[var(--color-muted)]">
              <li>• Next.js App Router + Prisma + NextAuth</li>
              <li>• Premium SaaS UI with Tailwind v4</li>
              <li>• AI provider abstraction (Ollama first)</li>
              <li>• Seeded data + ready migrations</li>
            </ul>
            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Today</p>
              <p className="text-lg font-semibold">Upper / Lower Power, 2.3k kcal target</p>
              <p className="text-xs text-[var(--color-muted)]">AI coach says: “Emphasize tempo + keep shoulders happy.”</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="gradient-border">
              <div className="rounded-2xl p-6">
                <div className="mb-4 inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[var(--color-accent-2)]">
                  {feature.title}
                </div>
                <p className="text-base text-[var(--color-muted)]">{feature.description}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="flex flex-col gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Pricing</p>
            <h2 className="text-3xl font-semibold">Launch today, scale tomorrow</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Billing-ready architecture with placeholder plans and Stripe-friendly schema.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                  {tier.name === "Pro" && (
                    <span className="rounded-full bg-[var(--color-accent)]/20 px-3 py-1 text-xs text-[var(--color-accent)]">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold">{tier.price}</p>
                <p className="text-sm text-[var(--color-muted)]">{tier.desc}</p>
                <ul className="space-y-2 text-sm text-[var(--color-muted)]">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-[2px] h-4 w-4 text-[var(--color-accent-2)]" /> {perk}
                    </li>
                  ))}
                </ul>
                <Button variant={tier.name === "Pro" ? "primary" : "secondary"} className="w-full" asChild>
                  <Link href="/sign-up">Start {tier.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
