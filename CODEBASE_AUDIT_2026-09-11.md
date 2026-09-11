# RavenMUN codebase audit

**Date:** 2026-09-11
**Scope:** Next.js routes and pages, client mutations, authorization, Supabase/Prisma schema and migrations, storage uploads, caching, and the Hocuspocus collaboration server.

## Findings addressed

- Application forms now validate field IDs, field types, select options, duplicate questions, required values, and fee input before persistence. The editor keeps question identity stable during deletion, preserves decimal fees, writes compatible JSON, and invalidates the ISR pages after a save or availability change.
- Authorization now reads the current database role, assignment, suspension state, application state, and active session on every protected request. Role changes, account deletion, suspension, and session revocation therefore take effect without waiting for a JWT or process cache to expire.
- Collaboration document saves re-check the active session, suspension, current role, committee assignment, and write permission at save time. Permission updates and document/version routes are committee-scoped.
- Role assignment validates targets and role values, protects super-admin accounts, rejects duplicate or oversized bulk requests, and prevents self-deletion. Vote responses return aggregate counts and the current user’s choice without exposing voter IDs.
- Paginated admin, ticket, gallery, roll-call, delegation, log, payment, and user endpoints now enforce positive bounded page and limit values.
- Ticket uploads enforce request-wide file count and size limits, validate signatures, and remove partial uploads on failure. Private storage signing no longer returns raw storage paths when signing fails.
- Passwordless challenge creation no longer performs an account lookup before sending a challenge. Payment review rolls back the receipt update if the linked application cannot be updated.

## Verification

- `pnpm exec tsc --noEmit` passed.
- `pnpm test` passed.
- `pnpm lint` passed with zero errors; the repository still has pre-existing warnings for unused imports, image elements, and hook suggestions.
- `pnpm build` passed and generated all application and API routes successfully.
- `pnpm test:live` passed with the disposable live workflow, including role routing, protected API access, collaboration persistence/reload, security scanning, and gallery upload/delete. The test used `LIVE_TEST_SKIP_INVITES=true` because invitation delivery requires external Turnstile/email services.

Production requires shared Upstash rate-limit credentials. The live test used `RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true` only for the local test server; that fallback must remain disabled in production.
