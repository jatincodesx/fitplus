import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, Sparkles } from "lucide-react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b14] px-4 py-8 sm:px-6 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(99,102,241,0.18),transparent_26%),radial-gradient(circle_at_50%_110%,rgba(16,185,129,0.12),transparent_34%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 shadow-[0_40px_120px_rgba(2,6,23,0.55)] backdrop-blur xl:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden flex-col justify-between border-r border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.94),rgba(8,15,32,0.98))] p-10 xl:flex">
          <div className="space-y-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 text-sm font-black text-white">
                FP
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Company product</p>
                <p className="text-xl font-semibold text-white">FitPilot AI</p>
              </div>
            </Link>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                <Sparkles className="h-4 w-4" />
                Unified product access
              </div>
              <h2 className="max-w-xl text-4xl font-semibold leading-tight text-white">
                One account surface for the customer app, the operations console, and the platform layer.
              </h2>
              <p className="max-w-xl text-base text-slate-300">
                Email/password, Google, and Apple now feed the same account model so your product, staff, and founder access stay aligned.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="font-semibold text-white">Customer app</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Workouts, nutrition, coach, progress, profile, and billing for paying users.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-1 h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="font-semibold text-white">Operations console</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Internal staff tools for user lifecycle review, support actions, and account operations.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-indigo-300" />
                  <div>
                    <p className="font-semibold text-white">Platform console</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Founder-grade analytics, admin oversight, security visibility, and platform settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
            <span>Role-aware routing and linked identity flows</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 xl:p-10">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-7 shadow-2xl shadow-slate-950/40 sm:p-9">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>

            <div className="mt-8">{children}</div>

            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
