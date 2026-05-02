# FitPlus Windows + Paperclip Setup

## Project

- Project name: FitPlus
- GitHub repo: https://github.com/jatincodesx/fitplus.git
- Recommended branch to start from: `main`
- Local branches at preparation time: `main`
- Remote branches at preparation time: `origin/main`

## Windows Setup

Install Git and Node.js 20.9 or newer first.

```bash
git clone https://github.com/jatincodesx/fitplus.git
cd fitplus
git fetch --all --tags
git checkout main
git pull --ff-only
git switch -c paperclip/fitplus-dev
```

## Dependencies

This repo uses npm and commits `package-lock.json`.

```bash
npm install
```

For the Expo mobile app, install from the repo root first, then use the root mobile scripts.

## Development

```bash
npm run dev
```

The web app runs on http://localhost:3000 by default.

Mobile development commands:

```bash
npm run mobile:dev
npm run mobile:ios
npm run mobile:android
```

## Build

```bash
npm run build
```

Cloudflare build and deploy scripts exist, but do not run deploy commands from a new machine until deployment secrets and target settings are intentionally confirmed.

## Environment Setup

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Fill in local values for database, auth, email, Stripe, and optional AI provider settings. Do not commit `.env`, `.env.local`, or any file containing real secrets.

The mobile app may also need:

```bash
cp mobile/.env.example mobile/.env
```

## Database

The app uses Prisma with PostgreSQL. For local development against Supabase or another Postgres database:

```bash
npm run db:generate
npm run db:push
```

Optional demo seed:

```bash
npm run db:seed
```

## Codebase Map

- `app/`: Next.js App Router pages, layouts, middleware-protected app areas, and API route handlers.
- `app/(app)/`: signed-in customer experience, including dashboard, workouts, nutrition, progress, coach, billing, and profile.
- `app/(ops)/admin/`: admin operations area.
- `app/(platform)/superadmin/`: superadmin/platform management area.
- `app/api/`: backend API routes for auth, account, AI, workouts, nutrition, progress, billing, mobile, and admin workflows.
- `components/`: reusable UI and feature components.
- `components/ui/`: base design-system primitives.
- `components/layout/`: app shells and navigation wrappers.
- `components/auth/`, `components/workouts/`, `components/nutrition/`, `components/progress/`, `components/billing/`: feature UI.
- `lib/`: server and shared application logic, including auth, Prisma, billing, email, AI, user scaffolding, tokens, and page data loaders.
- `prisma/`: schema, migrations, local seed script, and legacy SQLite migrations kept for reference.
- `mobile/`: Expo React Native client.
- `packages/contracts/`: shared types/contracts for web and mobile.

UI changes usually live in `app/**/page.tsx` and `components/**`. Business logic and data loading usually live in `lib/**`. API behavior lives in `app/api/**/route.ts`. Database shape lives in `prisma/schema.prisma` and committed migrations.

## Paperclip / Codex Rules

- Always create a working branch before making changes.
- Use branch names like `paperclip/fitplus-dev` or `codex/<short-task-name>`.
- Do not push directly to `main`.
- Do not deploy automatically.
- Do not commit secrets, API keys, tokens, credentials, private keys, or real `.env` files.
- Do not rewrite Git history or force push.
- Do not delete files unless they are clearly generated or temporary and the deletion has been reviewed.
- Before pushing, run at least:

```bash
git status
npm run build
```
