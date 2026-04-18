# Company Access Model

## Roles

- `SUPERADMIN`: Founder / CEO / platform owner. Lands in `/superadmin` with platform-wide analytics, admin oversight, settings, and full audit visibility.
- `ADMIN`: Internal staff and operations. Lands in `/admin` with user management, support actions, and operational audit visibility.
- `USER`: Customer / end user. Lands in `/dashboard` with the fitness product only.

## Route Areas

- Customer app: `/dashboard`, `/workouts`, `/nutrition`, `/coach`, `/progress`, `/profile`, `/billing`
- Operations console: `/admin`
- Platform console: `/superadmin`

Route protection is enforced in both `proxy.ts` and server-side guards in `lib/auth.ts`.

## Auth Entry Points

- `/sign-in`: email/password, Google, Apple
- `/sign-up`: email/password, Google, Apple
- `/auth/complete`: role-aware post-auth landing route

Matching emails reuse the same account across password, Google, and Apple sign-in through the existing NextAuth account-linking model.

## First Superadmin Bootstrap

The seed script no longer creates a demo superadmin by default. Use the explicit bootstrap command instead:

```bash
BOOTSTRAP_SUPERADMIN_EMAIL=ceo@yourcompany.com \
BOOTSTRAP_SUPERADMIN_NAME="CEO Name" \
BOOTSTRAP_SUPERADMIN_PASSWORD="ChangeThis123" \
npm run bootstrap:superadmin
```

Behavior:

- If the user already exists, the script promotes that account to `SUPERADMIN`.
- If the user does not exist, the script creates an active `SUPERADMIN` account when a password is supplied.
- If another active superadmin already exists, the script refuses to promote a different account.
- After bootstrap, additional admins can be promoted from the platform console.

## Demo Seeding

- `npm run db:seed` creates demo `USER` and `ADMIN` accounts only.
- To intentionally seed a demo superadmin, set `SEED_DEMO_SUPERADMIN=true`.
