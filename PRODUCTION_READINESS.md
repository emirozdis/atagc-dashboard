# RavenMUN production handoff

This repository contains the RavenMUN implementation and its PostgreSQL migrations. The application is intended to run against a new RavenMUN database; the old ATAGC database must not be reused.

## Required production services

- Next.js 16 application with `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and server-side Prisma access through `DATABASE_URL`.
- Supabase URL/keys are still required only for the optional Storage and browser realtime integrations; they are not database credentials.
- Upstash Redis via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Rate-limited routes fail closed in production when shared rate limiting is unavailable.
- Resend (`RESEND_API_KEY`) or SMTP credentials, plus `EMAIL_FROM`.
- A continuously running email-outbox worker: `pnpm run email:worker`.
- A separately deployed Hocuspocus process for collaborative committee documents, with the collaboration variables from `env.example`.

## Database deployment

Apply `supabase/migrations` in filename order, from `0001_ravenmun_foundation.sql` through the latest migration. The migrations create the RavenMUN schema, private storage buckets, RLS lockdown, atomic application/assignment/announcement/auth/payment/invitation workflows, and passwordless cleanup.

The database configured in the local `.env` has now been initialized and checked. All 16 migrations were applied, the Supabase migration ledger was recorded, all 46 public tables have RLS enabled, the five application forms are present, and a rollback smoke test passed for applications, assignments, committee synchronization, announcements, email outbox jobs, payment receipts, and delegation invitations. The smoke test left no rows behind.

Migration `0016_ravenmun_rpc_privilege_lockdown.sql` additionally removes accidental `anon`/`authenticated` execution grants from the server-only `SECURITY DEFINER` workflows. The live privilege check confirms these RPCs are executable by `service_role` only.

`DATABASE_URL` is the running application's server-only Prisma database connection. `SUPABASE_PROJECT_PASSWORD` remains an operations credential. The running application does not use Supabase API keys for database access; the URL/anon key/service-role key are only needed if Storage or browser realtime remains enabled.

Before production traffic:

1. Apply the migrations to a staging Supabase project.
2. Confirm the five active application forms are present and active.
3. Verify the service-role RPCs exist and are executable only by `service_role`.
4. Verify every storage bucket is private and signed downloads work.
5. Test email challenge delivery and the outbox retry path.
6. Take a database backup before applying the passwordless cleanup migration.

## Verification commands

```text
pnpm test
pnpm exec tsc --noEmit
pnpm run build
```

The supported build script uses the Webpack production path (`next build --webpack`) because the local Windows SWC binary is not valid in the current development environment. A deployment environment should install the correct native Next.js optional dependency and can validate the native build separately.

The repository-wide ESLint check passes with no errors. The remaining compatibility modules are still candidates for future cleanup, but they no longer block the lint gate.

## Security expectations

- Only verified email challenges create accounts or sessions.
- Password and legacy application mutation endpoints return `410 Gone`.
- Applications are one-page, server-validated, version-snapshotted, and unique per account/type.
- Conference assignment is separate from application acceptance and site-admin privileges.
- Uploads are size-limited, signature-checked, stored in private buckets, and addressed with random server-generated names.
- Signed QR payloads, device codes, invitation tokens, login exchanges, and OTP hashes use server secrets and single-use/expiry checks.
- Suspension and session revocation are checked server-side on every protected API request.
