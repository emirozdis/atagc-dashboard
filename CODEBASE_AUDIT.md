# ATAGC Dashboard — Comprehensive Codebase Audit

**Audit date:** 2026-08-01
**Audited path:** `C:\Desktop\atagc-dashboard`
**Audited revision:** `6db6c0496d3fc7962fd368cc35f4e167c614b329` (`KVKK Update`)
**Branch state:** `dev` is clean and one commit behind `origin/dev`.
**Audit type:** source- and configuration-level review; no application-code changes were made.

## 1. Executive summary

ATAGC Dashboard is a substantial event-management portal built as a Next.js App Router application with TypeScript, React, NextAuth credentials authentication, Supabase/Postgres, Supabase Storage, email notifications, QR workflows, and a separate Hocuspocus/Yjs collaborative editor server.

The product surface is broad and coherent: application onboarding, dynamic forms, delegation management, participant profiles and payments, committee workspaces, voting, roll call, collaborative documents, announcements, resources, tickets, catering, gallery management, observer operations, press uploads, and security scanning are all represented in the codebase.

The principal risk is not lack of functionality; it is inconsistent authorization and contract discipline around a service-role database client. Nearly every server route uses a Supabase service-role client, which bypasses database RLS. That makes every missing or overly broad application-level check a direct data-integrity or confidentiality issue. Several such gaps are present.

### Release assessment

**Recommendation: do not treat the current revision as production-ready until the Critical and High findings below are addressed and tested.**

Most urgent:

1. An admin-level user can submit an arbitrary role, including `superadmin`, through `/api/admin/users`.
2. Committee-scoped operations trust caller-supplied committee IDs or resource IDs in voting, roll call, and document restore/status APIs.
3. Magic-link flows use both `used` and the schema’s `is_used`, which can break invitation registration and display.
4. Application approval writes `day1/day2/day3` into `catering_logs`, while the tracked schema has no such columns.
5. Gallery code depends on `photo_areas`, `press_photos`, and `system_settings.gallery_enabled`, none of which appear in the tracked schema.
6. The admin application list/update APIs allow only `superadmin`, although the UI and route protection expose the area to `admin` users.
7. The collaborative editor client/server use inconsistent environment variable names and default ports.

### Confidence and limitations

This report is based on the checked-out source, configuration, tracked schema snapshots, route/component references, and static searches. The tracked `db.scheme` explicitly says it is context-only, so database drift findings should be verified against the live Supabase schema before migration decisions are made. `.env.local` exists but its values were intentionally not read or reproduced. Dependencies are not installed in the checkout, so lint and TypeScript compilation could not be executed.

The checkout is one commit behind `origin/dev`. The newer remote commit (`0d38012`, “Announcement banner / state for application disabled”) was not included in this audit because it is not in the working tree under review.

## 2. Repository inventory and architecture

### 2.1 Size and composition

The repository contains approximately 292 visible source/configuration files after excluding generated `.next` output and dependency directories:

| Area | Files | Role |
|---|---:|---|
| `app` | 141 | App Router pages, layouts, API routes, global styles/providers |
| `components` | 97 | Feature components, layouts, dashboards, shadcn/Radix UI |
| `hooks` | 2 | Debounce and Supabase realtime helpers |
| `lib` | 25 | Authentication, authorization, roles, schemas, storage, email, logging, clients |
| `public` | 2 | Static assets |
| `collab-server` | 1 | Hocuspocus websocket server |
| Tracked root/config files | 24-ish | Build, TypeScript, package, schema/policy snapshots, environment template |

Notable generated/non-business content:

- `.next` contains generated build output and should not be used as an audit source of truth.
- `lib/disposableEmailDomains.ts` is a generated/static domain list and is roughly 72,000 lines; its size is not indicative of business complexity.
- `components/ui/*` is a collection of reusable Radix/shadcn-style primitives. These were inventoried as framework wrappers rather than audited as independent business workflows.

### 2.2 Runtime architecture

```text
Browser / Next.js pages
        |
        +-- NextAuth credentials session (JWT cookie)
        |
        +-- Next.js API routes
        |       |
        |       +-- getAuthorization / apiHandler / Logger
        |       +-- service-role Supabase client (bypasses RLS)
        |       +-- Supabase Storage signed URLs/uploads
        |       +-- SMTP email / Turnstile verification
        |
        +-- Hocuspocus provider (editor websocket)
                |
                +-- collab-server/hocuspocus-server.ts
                        |
                        +-- service-role Supabase document persistence
```

The central security boundary is application code, not the database policy layer. This is a valid architecture only if every route performs complete resource-level authorization and every write validates ownership, role, enum, and relationship constraints.

### 2.3 Root/configuration files

- `package.json`: Next dev/build/start scripts plus a separate `collab` script; no test script.
- `package-lock.json`: dependency lockfile.
- `tsconfig.json`: strict TypeScript, no emit, `@/*` alias, incremental compilation.
- `next.config.ts`: effectively empty; no explicit security headers, image policy, redirects, or build configuration.
- `eslint.config.mjs`: Next core-web-vitals and TypeScript ESLint configuration.
- `postcss.config.mjs`, `components.json`: Tailwind/PostCSS and UI-generator configuration.
- `proxy.ts`: Next 16 proxy/middleware for authentication, role-based route redirection, and team-area routing.
- `db.scheme`: context-only database snapshot, not a runnable migration source.
- `rls_policies.json`: small snapshot of RLS policies for selected tables.
- `rpc_functions.json`: snapshot of database functions, including security-definer authorization helpers.
- `env.example`: Supabase, NextAuth, JWT, SMTP, Turnstile, and collaboration variables; it documents `COLLAB_PORT`, while code reads `NEXT_PUBLIC_COLLAB_PORT`.
- `.gitignore`: ignores dependencies, build output, and environment files. `.env.local` is present and ignored; secret values were not inspected.

## 3. Feature and file audit

### 3.1 Public/onboarding flow

Relevant files: `app/page.tsx`, `components/application-form/*`, `app/api/forms/route.ts`, `app/api/applications/route.ts`, `app/api/auth/verify/route.ts`, `app/api/auth/register/route.ts`, `app/api/high-schools/route.ts`, `app/api/delegation/*`.

Implemented capabilities:

- Landing page and dynamic application-form selection.
- Account/email verification with Turnstile and disposable-domain blocking.
- Multi-step application form with account, personal details, KVKK consent, role/form selection, delegation details, dynamic template-defined fields, and success screen.
- Server-side validation of account/personal/KVKK data using Zod.
- High-school search and manual-school fallback.
- Application submission, application status, payment status, and notification/audit side effects.
- Delegation leader creation, invitation email/magic link, invite codes, member joining, acceptance state, and member management.

The dynamic form server path verifies the static account/personal structures but does not comprehensively validate all submitted dynamic fields against the selected template’s field definitions before storing `form_data` (`app/api/applications/route.ts:217-245`). Required-field/type enforcement can therefore be bypassed by a direct API caller.

### 3.2 Authentication and account security

Relevant files: `app/login/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `lib/auth.ts`, `lib/getAuthorization.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/check/route.ts`, `app/api/auth/devices/route.ts`, `app/api/auth/password/*`, `app/api/auth/supabase-token/route.ts`, `app/api/auth/user-status/route.ts`.

Implemented capabilities:

- NextAuth credentials login backed by Supabase users.
- bcrypt password verification.
- Login rate limiting and Turnstile checks.
- Maintenance-mode login restriction.
- Suspension checks.
- Email OTP for admin or opt-in 2FA.
- Database-backed active sessions and device/session revocation.
- JWT role/application-status synchronization.
- Password request, reset, change, and session cleanup logic.
- Short-lived Supabase JWT generation for authenticated browser operations.

Authorization layers:

- `proxy.ts` protects page routes and routes users by effective role.
- `lib/getAuthorization.ts` validates the NextAuth session, active session row, exact role allowlists, optional approval state, and custom checks.
- `lib/roles.ts` defines role groups and effective-role mapping.
- `lib/permissions.ts` provides rank-based role-management checks, but that helper is not used by the most sensitive admin user-role update route.

### 3.3 Participant experience

Relevant pages/components: `app/dashboard/page.tsx`, `app/dashboard/ParticipantDasboard.tsx`, `app/(shared)/*`, `components/dashboard/*`, `components/tickets/*`.

Implemented capabilities:

- Participant dashboard, identity card, QR identity, application status, and announcements.
- Profile/personal details, privacy controls, profile image, notification preferences, and optional 2FA.
- Payment instructions, receipt upload, payment status, and receipt history.
- Delegation management and invitation/member status.
- Committee dashboard, member list, topics, resources, roll call, voting, and document editor.
- Participant-to-participant connection requests and notifications.
- Catering status, resources, gallery, support tickets, and QR scanning.

### 3.4 Committee workspace and collaboration

Relevant files: `app/dashboard/committee/*`, `app/dashboard/editor/page.tsx`, `components/committee/*`, `components/dashboard/collaboration/*`, `collab-server/hocuspocus-server.ts`, `app/api/committee/*`, `app/api/votes/*`, `app/api/roll-call/*`, `app/api/documents/*`.

Implemented capabilities:

- Chairman/delegate/observer-specific committee views.
- Committee membership and member profile visibility.
- Topics, committee resources, voting options/results, and vote status.
- QR-based roll-call creation, token generation, scanning, statistics, history, and SSE stream.
- Collaborative Tiptap/Yjs editor through Hocuspocus.
- Permission toggling for committee members and read-only/write state.
- Document autosave, version snapshots, version history, and restore.

The collaboration design is functionally ambitious, but its resource-level authorization needs tightening before it can be trusted for committee-confidential documents. See findings C-2, C-3, and H-6.

### 3.5 Admin console

Relevant pages/components: `app/admin/*`, `components/admin/*`, `app/api/admin/*`.

Implemented capabilities:

- Admin dashboard statistics, recent applications, tickets, and activity logs.
- Application review/detail/status changes and committee assignment.
- User search, user detail, warnings, suspension, deletion, role changes, and payment upload.
- Application-form/template administration.
- Committee/delegation management.
- Committee documents and roll-call history.
- Resource upload/listing, announcements, catering operations, payment review/charts.
- System settings, maintenance mode, application opening state, event/payment settings.

The admin UI is more permissive than some APIs. For example, page access uses the admin role group, but the application list/update API currently accepts only `superadmin` (`app/api/applications/route.ts:426-449`).

### 3.6 Organisation, observer, press, and security areas

Relevant files: `app/organisation/*`, `components/organisation/*`, `app/api/observer/*`, `app/api/gallery/*`.

Implemented capabilities:

- Organisation dashboard with role-specific navigation.
- Observer assignment, automatic assignment, committee relevance, task creation, task listing, and task status.
- Press gallery browsing and upload.
- Security QR scanning UI.

The security scanner is currently a UI mock: it reads a QR value, displays a toast, and resets after two seconds, but does not call an API or create a gate/security log (`app/organisation/security/scan/page.tsx:16-25`). Navigation also exposes `/organisation/security/logs`, but no corresponding page exists (`lib/navigation.ts:233`).

### 3.7 API route inventory

The application contains approximately 80 route files. Their responsibilities are grouped below.

| Route group | Files/endpoints | Responsibility |
|---|---|---|
| `/api/admin/*` | committee assignment, committees, delegations, forms, logs, payments, roll call(s), settings, stats, users, warnings | Administrative CRUD, review, reporting, assignment, and configuration |
| `/api/auth/*` | NextAuth, check, devices, password request/change/reset, register, Supabase token, user status, email verification | Login, registration, recovery, sessions, identity state |
| `/api/applications*` | list/create, detail | Public submission and admin review/status |
| `/api/announcements` | list/create | Targeted/public notices |
| `/api/catering/*` | status, update status | Participant status and admin scan logging |
| `/api/committee/*` | members, my committee, roll-call details/history | Committee membership/workspace data |
| `/api/connections*` | create/list/respond | Networking requests |
| `/api/delegation/*` | magic links, invite codes, join, members, validation/completion/status | Delegation onboarding and membership |
| `/api/documents/*` | versions, restore | Committee document history and restore |
| `/api/forms` | active form templates | Public onboarding form metadata |
| `/api/gallery/*` | list, areas, status, upload | Press/photo gallery |
| `/api/high-schools` | search/list | School lookup |
| `/api/observer/*` | assignment, auto-assignment, committees, info, list, tasks | Observer operations |
| `/api/participant/me` | participant aggregate data | Dashboard data |
| `/api/payment/*` | status, upload | Participant payment workflow |
| `/api/resources` | list/upload | General and committee resources |
| `/api/roll-call/*` | create, scan, token, stats, stream | QR attendance |
| `/api/settings` | public settings | Public event/payment metadata |
| `/api/tickets*` | list/create/detail/reply | Support tickets and attachments |
| `/api/upload` | profile/general upload | File upload helper |
| `/api/votes/*` | create/list, cast, status | Committee voting |

## 4. Data model and persistence review

### 4.1 Tracked tables

The schema snapshot covers users, user details/consents/warnings, sessions, applications/forms, payment receipts, delegations/invites/magic links/members, committees/members/documents/versions/topics, observer allocations/tasks, resources, announcements, roll calls/logs, tickets/messages, connections, system settings, and votes/options/responses.

### 4.2 RLS and service-role implications

`rls_policies.json` contains policies for only a subset of tables: committee documents, logs, roll-call logs, users, vote responses, and votes. The application’s server client (`lib/SERVER_supabase.ts`) uses the Supabase service-role key, so these policies are not a fallback for server routes. Route-level authorization must therefore be complete.

The policy snapshot itself contains useful database helpers such as `is_admin`, `is_committee_chair`, and `is_committee_member`, but server code frequently performs its own checks and sometimes omits the relationship check entirely.

### 4.3 Schema/implementation drift

The following mismatches are concrete if `db.scheme` reflects the deployed schema:

| Area | Code expectation | Tracked schema | Impact |
|---|---|---|---|
| Delegation magic links | `used` in `app/page.tsx:51-55`, `app/api/auth/register/route.ts:51-59`, and dashboard types | `is_used` in `db.scheme:80-87` | Invitation validation/registration/display can fail or show incorrect status |
| Catering approval | `day1`, `day2`, `day3` inserted at `app/api/applications/route.ts:376-390` | `catering_logs` has only `datetime` plus audit fields at `db.scheme:51-59` | Approval side effect can fail with unknown-column errors |
| Gallery | `photo_areas`, `press_photos`, `gallery_enabled` at `app/api/gallery/*` | Those tables/column are absent from `db.scheme` | Gallery routes may fail at query time or always appear disabled |
| System settings | Admin settings reads/writes `gallery_enabled` | Snapshot has no `gallery_enabled` | Setting is not persisted/read consistently |
| Ticket reply | Attachment-only replies are accepted by route validation | `ticket_messages.message` is `NOT NULL` | Attachment-only reply can fail at insert (`app/api/tickets/[id]/route.ts:98-151`) |
| Committee permissions | UI/API names `can_edit`/`canEdit` in places | Tracked table column is `can_write` | Permission toggle currently has an API method gap and naming translation risk |

The schema also lacks several likely integrity constraints: unique user-to-details, unique committee membership pairs, unique roll-call `(roll_call_id,user_id)`, unique vote response `(vote_id,user_id)`, and connection-pair uniqueness. Application-level checks alone are race-prone.

## 5. Security and correctness findings

Severity is based on impact and exploitability in the current architecture, where server routes use a service-role client.

### Critical

#### C-1 — Arbitrary privileged role assignment

`app/api/admin/users/route.ts:139-171` allows `admin` and `superadmin` to update a user’s role directly from request JSON. The batch branch writes `body.role` for `body.ids` (`:149-154`), and the single-user branch writes `body.role` (`:157-171`). There is no enum validation, no `canManageRole` check, no protection against assigning `superadmin`, and no protection against changing one’s own role.

**Impact:** an admin-level account can promote itself or another account to `superadmin`, gaining full administrative access.

**Remediation:** validate roles against the role enum; enforce a server-side role hierarchy; permit only `superadmin` to create/assign `superadmin`; block self-escalation and sensitive-role changes; add audit tests for every role transition; ideally move role transition logic into a transaction or controlled database function.

#### C-2 — Cross-committee document restore

`app/api/documents/[id]/restore/route.ts:19-35` fetches a `document_versions` row by `versionId` without checking its `committee_id`, then updates `committee_documents` for the URL `id`. A permitted caller can combine a version from one committee with a target document from another.

**Impact:** cross-committee document disclosure/corruption and unauthorized content replacement.

**Remediation:** fetch `committee_id` with the version and require it to equal the route committee ID; verify the caller owns/manages that committee; perform restore atomically in a database function.

### High

#### H-1 — Committee ownership is missing in roll-call creation

`app/api/roll-call/create/route.ts:11-45` permits chairman/deputy roles and accepts `body.committee_id`. When an ID is supplied, the route does not verify that the caller is the committee owner/member authorized to create sessions for that committee.

**Impact:** a chairman/deputy can create attendance sessions for arbitrary committees.

#### H-2 — Committee ownership is missing in vote creation/status changes

`app/api/votes/route.ts:15-29` accepts a caller-supplied `committeeId` for chairman/deputy/superadmin without a committee relationship check. `app/api/votes/[id]/status/route.ts:11-31` allows chairman/deputy/superadmin to change any vote by ID without loading and authorizing its committee.

**Impact:** unauthorized vote creation, opening, and closing across committees.

#### H-3 — Vote casting does not validate vote state, option ownership, or membership

`app/api/votes/cast/route.ts:10-32` requires only authentication, checks an application-level prior response, and inserts the caller-supplied `(voteId, optionId)`. It does not verify that the vote is open, the option belongs to the vote, or the caller is an approved member of the vote’s committee. The schema also has no unique `(vote_id,user_id)` constraint.

**Impact:** arbitrary authenticated users may cast votes, cast into closed votes, use options from another vote, or double-vote under a race.

**Remediation:** load vote and option together; verify status and committee membership; use a unique database constraint and handle conflict; define whether vote identity is public or secret before returning response data.

#### H-4 — Roll-call statistics disclose committee attendance to any authenticated user

`app/api/roll-call/[id]/stats/route.ts:16-43` checks only `requireAuth: true`, then returns counts for the roll call’s committee. It does not verify membership, chair ownership, or staff authorization.

**Impact:** authenticated users who obtain a roll-call ID can inspect attendance totals for other committees.

#### H-5 — Document version metadata is broadly readable and version writes lack ownership checks

`app/api/documents/[id]/versions/route.ts:14-29` permits any authenticated user to list versions for a committee. The POST branch (`:40-78`) permits several staff roles but does not verify that the caller manages the target committee.

**Impact:** committee document metadata leakage and unauthorized version insertion.

#### H-6 — Collaboration stateless messages are not fully authorized

`collab-server/hocuspocus-server.ts:167-205` authorizes `PERMISSION_UPDATE` by sender role but does not re-check committee ownership in the message handler, and accepts `FORCE_REFRESH` from any connected participant. The latter broadcasts reload and closes every connection in the document.

**Impact:** a connected participant may disrupt a committee editor session; permission-management behavior depends on connection-time checks and role only. The service-role persistence path also does not revalidate active-session revocation.

**Remediation:** authorize each message against the connected user, committee, and intended action; restrict force refresh to the chair/admin and ideally make it server-originated; validate payload schemas.

#### H-7 — Magic-link field drift breaks or weakens invitation flows

The schema uses `is_used` (`db.scheme:80-87`) and the completion API correctly uses it (`app/api/delegation/complete_magiclink/route.ts:49-60,214-218`). Other paths use `used`: the landing page selects/checks it (`app/page.tsx:49-59`), registration filters on it (`app/api/auth/register/route.ts:51-59`), and the delegation dashboard types/read it (`app/dashboard/delegation/page.tsx:50-55,558-598`).

**Impact:** Supabase queries can fail, valid links can be rejected, and used links can display as unused. Registration also does not filter the magic-link query by used state in the application submission path (`app/api/applications/route.ts:169-176`).

#### H-8 — Application review permissions do not match the admin product surface

`app/api/applications/route.ts:426-449` allows only `ROLES.SUPERADMIN` for list and update. The admin route group is exposed to the broader admin role group by `proxy.ts`, and the admin application page calls the endpoint (`app/admin/applications/page.tsx:69-89`).

**Impact:** ordinary admins can reach the screen but receive 403 responses; if the intended policy is admin review, the workflow is broken. If superadmin-only is intentional, the UI/route exposure is misleading.

#### H-9 — Admin payment upload does not implement the user-targeted admin contract

`components/admin/AdminPaymentUploadDialog.tsx:23-32` sends a `userId`, but `app/api/admin/payments/upload/route.ts:10-24` ignores it and uses the current session user. It also requires `requireApproved`, which is inappropriate for an admin operation unless every admin has an approved applicant record.

**Impact:** admin uploads can fail or target the wrong account; a UI action can mutate the uploader’s own payment state instead of the selected user’s.

#### H-10 — Public user-status endpoint enables email/account enumeration

`app/api/auth/user-status/route.ts:8-49` is unauthenticated and returns different states for new users, users with applications, and users without applications; it also returns the existing user’s full name in the resume state.

**Impact:** attackers can enumerate registered emails and associated application state/name.

**Remediation:** use a uniform response for unknown/known addresses, avoid returning full name, and bind any continuation flow to a verified challenge.

#### H-11 — Verification/2FA OTPs use weak generation and plaintext storage

`lib/auth.ts:114-154` and `app/api/auth/verify/route.ts:42-100` use `Math.random()` for six-digit codes and store the codes in plaintext. Verification is primarily rate-limited by an in-memory, IP-derived limiter; forwarded IP headers are trusted directly.

**Impact:** lower-quality randomness, code exposure through database/log access, weak distributed brute-force controls, and possible limiter bypass behind proxies.

**Remediation:** use `crypto.randomInt`, store a hash/HMAC of the code, bind challenges to a purpose/session/request, cap attempts per email/challenge, expire and invalidate old codes, and derive the real client IP only from trusted proxy infrastructure.

#### H-12 — Attachment-only ticket replies conflict with the database schema

`app/api/tickets/[id]/route.ts:98-101` intentionally allows a reply with no text when files exist, but inserts `message` at `:147-151`; `db.scheme:178-187` declares `ticket_messages.message` not null.

**Impact:** a permitted UI action can fail at database insert time.

### Medium

#### M-1 — Generic API errors disclose internal messages

`lib/api-handler.ts:55-60` returns `err.message` in the generic 500 response. Database and storage errors are frequently thrown directly by routes.

**Impact:** schema/table/storage details may be exposed to clients.

**Remediation:** return a stable opaque error ID/message to clients, log the detailed error server-side, and preserve known validation/conflict responses separately.

#### M-2 — In-memory rate limiting and session validation do not scale horizontally

`lib/rate-limit.ts` and the LRU session validation cache in `lib/getAuthorization.ts:8-63` are process-local. Revoked sessions may remain accepted for the 60-second cache TTL, and rate-limit state is not shared between instances.

#### M-3 — Unbounded or weakly validated request parameters

Many routes parse JSON directly and use `parseInt` without consistent min/max bounds. Examples include user/application/ticket pagination and routes for votes, roll call, observer operations, settings, and connections. Zod schemas exist in `lib/schemas.ts`, but coverage is uneven.

#### M-4 — Upload validation trusts client MIME/type and filename extension

Ticket, payment, resource, gallery, and general upload routes validate declared MIME types and sizes but do not inspect magic bytes. Several derive extensions from `file.name` (`app/api/tickets/route.ts:119-125`, `app/api/tickets/[id]/route.ts:129-136`, payment upload `:34-43`).

**Recommendation:** inspect file signatures, normalize extensions from detected type, impose request-wide byte/count limits, and consider malware scanning for user-provided documents.

#### M-5 — Storage signing falls back to original paths/URLs

`lib/storage-utils.ts:39-46,58-63` returns an original public URL or raw path when signing fails. For private buckets, this can create confusing access behavior and can disclose storage path information.

#### M-6 — Email templates interpolate unescaped values into HTML

`lib/email-templates.ts:52-81,181-221` interpolates user names, codes, and link values directly into HTML. Names are user-derived and links can originate from request/application data.

**Recommendation:** HTML-escape text interpolations and allowlist URL origins/paths before inserting them into email markup.

#### M-7 — Collaboration environment configuration is inconsistent

`env.example:29-31` documents `COLLAB_PORT=1234`; the server reads `NEXT_PUBLIC_COLLAB_PORT` and defaults to 1234 (`collab-server/hocuspocus-server.ts:18-21`), while the browser editor reads the same public variable but defaults to 3001 (`app/dashboard/editor/page.tsx:144-147`).

**Impact:** local or misconfigured deployments can start the server on one port while the browser connects to another.

#### M-8 — Missing API endpoints and stale components indicate contract debt

- `app/dashboard/editor/page.tsx:192-203` sends `PUT /api/committee/members`, but `app/api/committee/members/route.ts` exports only `GET`.
- `app/admin/resources/page.tsx:78-82` sends `DELETE /api/resources`, but `app/api/resources/route.ts` exports only `GET` and `POST`.
- `components/admin/CateringManagementTable.tsx` is not referenced by the active admin catering page and expects a missing `/api/catering/all` plus day fields that conflict with the active scan-based catering model.

These are likely user-visible failures or dead code and should be resolved by either implementing the contract or removing the obsolete component.

## 6. Quality, maintainability, and operations

### 6.1 Verification status

The checkout has no installed `node_modules` binaries (`tsc`, `eslint`, and `next` are absent). `npm run lint` therefore fails because `eslint` is unavailable. No test script, test directory, CI workflow, Dockerfile, deployment manifest, or README was found.

The codebase declares strict TypeScript, which is a good baseline, but the source contains extensive `any`/`as any` usage in API responses, Supabase joins, and UI state. Strict mode therefore does not provide complete contract safety.

Recommended minimum verification pipeline:

1. Install from the lockfile in CI.
2. Run `tsc --noEmit`.
3. Run `eslint`.
4. Add route-level authorization tests with an in-memory/mock Supabase boundary.
5. Add database integration tests for uniqueness, role transitions, vote casting, document restore, magic links, and payment/catering/gallery contracts.
6. Run a production build and a smoke test covering each role group.

### 6.2 Error handling and observability

Positive foundations:

- `apiHandler` centralizes error responses and logging.
- `lib/logger/*` scrubs several sensitive key names before audit persistence.
- Many business writes emit structured audit records.
- Rate-limit and authorization failures have distinct responses.

Weaknesses:

- Several routes bypass `apiHandler` (`/api/auth/user-status`, `/api/admin/settings`, `/api/admin/roll-call`, `/api/settings`, and the roll-call stream among others), producing inconsistent logging/error semantics.
- Logger context trusts forwarded IP headers.
- Logs can contain PII and detailed errors; retention/redaction policy is not represented in the repository.
- There is no visible health check, metrics integration, alerting configuration, or operational runbook.

### 6.3 Data consistency and transaction boundaries

Several workflows perform multiple independent writes: application submission, application approval, payment receipt upload, delegation completion, document restore, and catering logging. If a later write fails, earlier writes can remain committed. The application approval path, for example, updates user role and then writes catering data without a transaction (`app/api/applications/route.ts:368-390`).

Use database transactions or carefully designed RPCs for multi-step state changes, and add compensating cleanup for storage uploads when the subsequent database insert fails.

### 6.4 UX/localization signals

The product content is predominantly Turkish, but `app/layout.tsx` sets `html lang="en"`. Several checked-out source strings show encoding artifacts such as `ATAGÃ‡`, `Ä°`, and `BaÅŸvuru`, suggesting inconsistent file/database encoding or terminal rendering. Confirm UTF-8 handling end-to-end and set the document language appropriately.

## 7. Prioritized remediation plan

### Phase 0 — block unsafe release

1. Lock down `/api/admin/users` role transitions and audit existing privileged users.
2. Add committee/resource ownership checks to vote creation/status, roll-call creation, document version/restore, roll-call stats, and collaboration messages.
3. Fix `used` → `is_used` consistently and add an end-to-end magic-link test.
4. Reconcile the live schema with catering and gallery code before enabling those workflows.
5. Resolve the admin application permission policy and payment-upload target contract.
6. Add database uniqueness/foreign-key/check constraints for votes, roll calls, memberships, user details, and connections.

### Phase 1 — harden identity and API boundaries

1. Replace OTP `Math.random` and plaintext storage with cryptographically secure, hashed challenges.
2. Remove user enumeration from `/api/auth/user-status`.
3. Stop returning raw internal error messages.
4. Centralize trusted client-IP extraction and move rate limiting/session revocation to shared infrastructure.
5. Apply Zod schemas and bounded pagination to every JSON/form endpoint.
6. Validate uploaded content by signature and clean up orphaned storage objects.

### Phase 2 — restore feature contracts

1. Implement or remove the missing `PUT /api/committee/members` behavior.
2. Implement `DELETE /api/resources` or remove the delete UI.
3. Correct the admin payment upload API to accept and authorize an explicit target user.
4. Reconcile catering’s old day-toggle component with the active scan/log model.
5. Implement security scan persistence and either build or remove the security logs page.
6. Standardize collaboration port variable names and defaults.

### Phase 3 — reliability and governance

1. Add CI for typecheck, lint, production build, dependency audit, and tests.
2. Add a real migration source of truth; stop relying on a context-only schema snapshot.
3. Add role-by-role and resource-by-resource integration tests.
4. Document deployment topology, trusted proxies, Supabase buckets, SMTP behavior, Hocuspocus, and required environment variables.
5. Add monitoring, health checks, log retention/redaction, backup/restore, and incident procedures.

## 8. Recommended test matrix

| Area | Must-test cases |
|---|---|
| Roles | Admin cannot assign superadmin; superadmin can; self-escalation blocked; effective-role routing matches API role checks |
| Committee access | Chairman/deputy can act only on owned/member committee; unrelated committee IDs return 403 |
| Votes | Only approved members vote; closed vote rejected; option belongs to vote; duplicate race produces one response |
| Roll call | Session creation ownership; scan token validity; stats privacy; duplicate scan behavior |
| Documents | Version list visibility; restore same-committee constraint; chair/admin ownership; collaboration refresh authorization |
| Applications | Dynamic required fields; verified email/magic-link rules; duplicate applications; approval transaction; catering side effect |
| Payments | Participant vs admin upload target; receipt status transitions; private URL signing; failed upload cleanup |
| Delegations | Unused/used link lifecycle; email match; replay; invite-code count; member uniqueness |
| Gallery/catering | Live schema compatibility; settings flag persistence; storage/database cleanup; duplicate daily catering log |
| Tickets/uploads | Attachment-only reply, request-wide size limits, MIME spoofing, signed URL failure behavior |
| Operations | Multi-instance rate limiting; session revocation; maintenance mode; SMTP failure; collab server/client port configuration |

## 9. Overall conclusion

The codebase has enough functionality to represent a complete ATAGC event-management product, and there are good foundations in its use of bcrypt, NextAuth, Zod, structured logging, rate limits, signed storage URLs, and role-aware navigation. The implementation is currently held back by inconsistent contracts and authorization checks rather than by missing product scope.

The highest-value engineering work is to make resource authorization explicit and testable, align the deployed schema with the code, and establish a CI/integration-test safety net. Once those are in place, the existing feature breadth should be maintainable without continuing to accumulate stale UI/API paths and schema assumptions.
