# FitPlus Production Launch (Cloudflare Workers + Supabase)

This runbook deploys the existing Next.js app to Cloudflare Workers (OpenNext) on a subdomain, while keeping your existing cPanel site untouched.

## 1) One-time local setup

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

## 2) Required environment variables

Set these in Cloudflare Worker settings (Production):

- `DATABASE_URL` (Supabase transaction pooler URL ending in `?pgbouncer=true&schema=public`)
  - Copy from: `Supabase Dashboard -> Project Settings -> Database -> Connection string -> Transaction pooler`
  - Paste the raw value only in Cloudflare. Do not include surrounding quotes.
  - Do not reconstruct the hostname or username manually. Copy the exact string Supabase shows for your project.
- `DIRECT_URL` (direct Supabase Postgres URL ending in `?schema=public`, used by Prisma CLI)
  - URL-encode special characters in the password if you type it manually, for example `@` -> `%40`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://fitplus.lumoxtech.com.au`
- `APP_BASE_URL=https://fitplus.lumoxtech.com.au`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_ENTERPRISE`
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `AUTH_DEBUG=false`

Optional:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AI_PROVIDER`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

## 3) Cloudflare deploy commands

```bash
# Authenticate once
npx wrangler login

# Verify/prepare R2 cache bucket (must match wrangler.jsonc)
npx wrangler r2 bucket create fitplus-app-opennext-cache

# Build and deploy
npm run cf:build
npm run cf:deploy
```

## 4) Bind custom domain in Cloudflare

1. Open Workers & Pages -> `fitplus-app`.
2. Go to **Settings -> Domains & Routes**.
3. Add custom domain: `fitplus.lumoxtech.com.au`.
4. Confirm it is active and attached to the production worker.

## 5) VentraIP DNS changes (keep cPanel site intact)

Only add/update the **subdomain** DNS record:

1. In VentraIP DNS zone for `lumoxtech.com.au`, create/update `fitplus` as:
   - Type: `CNAME`
   - Name/Host: `fitplus`
   - Target: the Cloudflare target shown when you add the custom domain
2. Do not change apex (`@`) or `www` records used by the existing cPanel website.

## 6) Stripe + Resend cutover

1. Stripe Dashboard -> Developers -> Webhooks:
   - Add/update endpoint to `https://fitplus.lumoxtech.com.au/api/stripe/webhook`
   - Keep signing secret in `STRIPE_WEBHOOK_SECRET`.
2. Stripe Dashboard -> Developers -> API keys / Products:
   - Ensure production keys and production `price_...` IDs are in Cloudflare env vars.
3. Resend Dashboard:
   - Verify sending domain/from address.
   - Set `EMAIL_FROM` to the verified sender.

## 7) Mobile app backend URL

Set mobile env to production origin only:

```bash
EXPO_PUBLIC_API_BASE_URL=https://fitplus.lumoxtech.com.au
```

Then rebuild/re-publish the mobile app so the bundled API base URL updates.
