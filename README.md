# FitPlus (FitPilot AI)

Premium full-stack fitness MVP built with Next.js (App Router), TypeScript, Tailwind v4, Prisma, and NextAuth. It ships with AI-assisted workouts, nutrition guidance, progress tracking, chat coaching, billing-ready scaffolding, and a demo seed so you can demo immediately or grow into a SaaS.

## Highlights
- Modern marketing site, auth (email/password + Google-ready), protected dashboard, onboarding, and SaaS-y shell.
- Prisma schema covering users, profiles, goals, workouts, nutrition, progress logs, chat history, and subscriptions.
- AI abstraction (local-first via Ollama) powering workout generation, nutrition suggestions, and coach chat with graceful offline fallbacks.
- Seeded demo user and content (`demo@fitpilot.ai` / `demo1234`) to showcase the product instantly.
- Tailwind v4 premium UI with light/dark toggle, charts, and responsive layouts.

## Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma + Supabase Postgres
- NextAuth (credentials + optional Google)
- React Query, Zod, Recharts, Radix primitives
- AI provider layer (Ollama-first, provider switchable via env)

## Repository Layout
- `app/` + `components/` + `lib/`: Next.js web app, API routes, auth, admin, billing, and shared UI/business logic.
- `mobile/`: Expo React Native app for iOS/Android clients.
- `packages/contracts/`: shared contract/types package used by mobile and web.
- `prisma/`: schema, migrations, and seed scripts for database state.
- `docs/`: project and architecture notes.

## Prerequisites
- Node 20.9+ and npm
- Supabase Postgres project (or any PostgreSQL database). For Supabase + Workers, use a pooled runtime `DATABASE_URL` and a direct `DIRECT_URL` for Prisma CLI commands.
- Optional: [Ollama](https://ollama.com) running locally for AI features (`ollama serve` and `ollama pull llama3.2`).

## Setup (Local)
1) Install dependencies  
```bash
npm install
```

2) Configure environment  
```bash
cp .env.example .env
# Update NEXTAUTH_SECRET (use `openssl rand -hex 32`) and set provider keys as needed.
```
Do not commit `.env` files; keep real secrets local or in deployment secret managers.

3) Database (Supabase Postgres)
- Set `DATABASE_URL` in `.env` to the Supabase transaction pooler string for runtime queries, and set `DIRECT_URL` to the direct database string for Prisma CLI commands:
```bash
DATABASE_URL="postgresql://prisma.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?schema=public"
```
- Sync schema non-interactively (safe bootstrap path for the current repo baseline):
```bash
npx prisma db push
```
- Generate Prisma client:
```bash
npx prisma generate
```

4) Seed demo data (creates the demo user, plans, logs)  
```bash
npm run db:seed
```

5) Run the app  
```bash
npm run dev
```
Visit http://localhost:3000 and use the demo credentials above or sign up with a new account.

## Email Delivery (Resend)
Auth and admin email flows now use a provider-ready email layer with Resend as the default provider.

Required vars for live delivery:
- `APP_BASE_URL` (for verification/reset/invite links; example: `https://app.fitplus.com`)
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM` (must be a verified sender in Resend, for example `FitPlus <no-reply@updates.fitplus.com>`)

Optional local fallback:
- `EMAIL_DEV_PREVIEW=true` (default in non-production)
  - When delivery is not configured or fails, the app logs a local email preview and does **not** claim delivery succeeded.

## AI Provider Configuration
- `AI_PROVIDER=ollama`  
- `OLLAMA_BASE_URL=http://localhost:11434`  
- `OLLAMA_MODEL=llama3.2`  
If Ollama isn’t running, API routes fall back to curated demo content and surface a friendly message. Future providers (OpenAI/Anthropic) can be wired by extending `lib/ai.ts`.

## Coach Session (Chat With Your Fitness Coach)
- Open Dashboard or Workouts and click **Coach Chat Session** to launch the guided coach chat.
- Pure chat experience (voice temporarily disabled); the coach gathers intake, summarizes, and auto-generates workout & nutrition plans when you end the session.
- After you end chat, you’re taken to a live “Building your plans” page, then to a premium summary with rationale, workout, and diet overviews.
- Safety: the coach avoids medical advice and prompts you to consult a professional for injuries.

## Auth
- Credentials via NextAuth route handler (`/api/auth/[...nextauth]`).
- Google OAuth ready—add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
- Protected routes enforced in `middleware.ts` for dashboard/app surfaces.

## Key Commands
- `npm run dev` – start dev server
- `npm run build && npm start` – production build
- `npm run db:generate` – regenerate Prisma client
- `npm run db:push` – push Prisma schema directly to the configured database
- `npm run db:deploy` – apply committed Prisma migrations
- `npm run db:seed` – seed demo data
- `npx prisma studio` – browse the DB UI
- `npm run mobile:dev` – run Expo mobile app
- `npm run mobile:ios` / `npm run mobile:android` – run native mobile targets

## Data Model (Prisma)
- User, Profile, Goal, WorkoutPlan, WorkoutDay, Exercise, WorkoutLog
- NutritionPlan, MealLog, WeightLog, MeasurementLog
- ChatMessage, Subscription (plan/status scaffold for Stripe)

## Feature Map
- **Landing**: premium SaaS hero, pricing, CTA to sign-up/demo dashboard.
- **Auth**: sign-up, sign-in, sign-out; protected dashboard via middleware.
- **Onboarding**: collects stats/goals, stores in `Profile` + `Goal`.
- **Dashboard**: summary cards, AI coach highlights, plan preview, recent chat.
- **Workouts**: AI-generated plan (or demo fallback), regenerate, exercise details.
- **Nutrition**: AI macros + meal suggestions, quick meal logging.
- **Progress**: weight trend chart + weight logging, adherence stat.
- **Coach Chat Session**: guided intake chat saved per user with AI abstraction, ends with auto-generated workout & nutrition plans and a summary page.
- **Billing**: mock current plan/state, ready to wire to Stripe.
- **Profile**: account + subscription snapshot with link to onboarding edits.

## Database Notes
The repository now targets PostgreSQL in Prisma (`provider = "postgresql"`).
For Supabase on Cloudflare Workers, use the Supavisor transaction pooler for `DATABASE_URL` and keep a direct `DIRECT_URL` for Prisma CLI workflows.

Because the original migration history was SQLite-based, the safest path from this repo state is:
1. `npx prisma generate`
2. `npx prisma db push`
3. `npm run db:seed` (optional demo data)

## Notes
- Tailwind v4 uses CSS-in-CSS tokens in `app/globals.css`; design tokens live there.
- The AI layer lives in `lib/ai.ts`; API routes call it and handle fallbacks gracefully.
- UI components live under `components/ui` and app shells under `components/layout`.
- Demo data is safe to remove; replace with your production flows as you wire Stripe/email/etc.

## Production Deployment (Cloudflare Workers)
Use the production launch runbook: `docs/deployment-cloudflare-workers.md`.
