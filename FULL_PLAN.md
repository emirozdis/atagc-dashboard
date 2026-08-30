# RavenMUN Full-Parity Rebuild Plan

## Summary

Transform `C:\Desktop\atagc-dashboard` in place into RavenMUN, retaining ATAGÇ’s working feature set while replacing its authentication, application model, navigation, branding, and insecure/broken contracts.

The launch includes:

- Full public conference website.
- Five application types: Delegate, Chairboard, Delegation, Press, and Observer.
- Multiple distinct applications per account.
- Passwordless authentication.
- Unified role-aware participant portal.
- Simplified administration panel.
- Full ATAGÇ feature parity.
- Purple/lilac/black/silver RavenMUN design.
- New Supabase backend with no ATAGÇ data migration.

## Architecture and Data Model

### Identity and permissions

Separate platform privileges from conference assignments:

- `AccountRole`: `member`, `site_admin`, `super_admin`.
- `ConferenceRole`: Delegate, Committee Chair, Deputy Chair, Press, Head Press, Observer, Head Observer, Security, Head Security.
- `ApplicationType`: Delegate, Chairboard, Delegation, Press, Observer.
- Delegation Owner and Delegation Member are delegation relationships, not conference roles.
- Each user has at most one active conference role, but may own or belong to a delegation simultaneously.
- Site Admin and Super Admin are assigned manually and never publicly applied for.
- Security and all head/team positions are assigned manually.

Application acceptance and conference assignment remain separate. Accepting a Chairboard application does not grant committee access until an administrator assigns Chair/Deputy Chair and a committee.

### Applications

- Allow one application of each type per account.
- Enforce a unique user/application-type database constraint.
- Applications are independently reviewed.
- Submitted applications cannot be edited.
- Store the exact form-version snapshot used for each submission.
- Seed editable SonMUN-based forms, replacing its Admin application with Observer.
- Keep ATAGÇ’s dynamic form administration but render applications as one-page forms.
- Track `pending`, `under_review`, `accepted`, `rejected`, and `withdrawn`.
- Show all applications as separate cards in the applicant portal.

### Payments

- Payment belongs to the participant’s final placement, not an individual application.
- Payment becomes available after primary role assignment.
- Delegation members pay individually unless marked exempt.
- Keep receipt upload, review, rejection notes, status history, and administrator reporting.

### New Supabase backend

Create proper migrations and constraints rather than copying `db.scheme`.

Include:

- Accounts, profiles, conference assignments, applications, form versions, and consents.
- Sessions, email challenges, trusted-device codes, and session revocation.
- Committees, membership, topics, documents, versions, votes, and attendance.
- Delegations, invitations, owners, and members.
- Payments, announcements, resources, tickets, gallery, catering, observer tasks, and security logs.
- Announcement recipients and email-outbox records.
- Uniqueness constraints for memberships, votes, attendance, profiles, connections, and applications.
- Complete RLS policies and centralized server-side resource authorization.
- Separate private storage buckets for receipts, profiles, resources, tickets, and gallery uploads.

## Authentication and Application Experience

### Passwordless authentication

Remove passwords, registration pages, password reset, bcrypt, and password-change functionality.

Email flow:

1. Applicant opens `/apply/[type]`.
2. Completes the entire one-page form.
3. Submission triggers an emailed one-time code.
4. Verification creates or retrieves the account.
5. The user receives a one-year session.
6. The authenticated application submission is created.
7. The user lands in the portal and may submit another distinct application.

Returning users can log in through:

- An emailed one-time code.
- A short, single-use code generated from an already authenticated device.

Security rules:

- Codes are cryptographically generated and stored hashed.
- Email codes expire after ten minutes and have attempt limits.
- Device codes expire after ten minutes, work once, and can only be generated from an active session.
- Sessions last one year unless manually revoked or the account is suspended.
- Users can view and revoke active devices.
- Admin accounts use the same selected passwordless options.
- Responses do not reveal whether an email already has an account.
- Rate limits use shared infrastructure rather than process-local memory.

### One-page application UX

Follow SonMUN’s application structure:

- `/apply` displays the five application cards.
- `/apply/[type]` displays one continuous form.
- Use clear section headings instead of gated steps.
- Two-column desktop fields and single-column mobile fields.
- Sticky section index and completion summary without hiding fields.
- Inline validation and word/character counters.
- Local draft autosave before authentication.
- Committee preference controls prevent duplicate choices.
- Email verification appears only when the completed form is submitted.
- Logged-in users receive prefilled shared profile information.
- A dashboard action allows applying for another available role.

### Delegation workflow

- A Delegation Owner submits the Delegation application.
- After acceptance, the owner creates email invitations or invitation codes.
- Each member verifies their own email and completes an individual Delegate application.
- Invitations link the account and application to the delegation.
- Owners manage invitation and membership status.
- Members can view the delegation but cannot manage invitations.
- Replayed, expired, used, and mismatched invitations are rejected.

## Product and Interface Changes

### Public website

Add English-language pages inspired by SonMUN’s structure:

- Branded homepage.
- Conference information and countdown.
- Committees and committee detail.
- Executive team.
- Letters and conference resources.
- Application selection and forms.
- Login and portal entry.
- Contact, venue, dates, and social links.

Conference content remains editable through the administration panel.

### Unified portal

Replace `/dashboard` and `/organisation` with one `/portal` shell.

Shared modules:

- Overview, profile, applications, payment, digital ID, announcements, resources, gallery, connections, catering, and support.

Role-specific modules:

- Delegate: committee, voting, roll call, and collaborative documents.
- Chairboard: committee management, member permissions, votes, attendance, documents, and versions.
- Press: gallery and media uploads.
- Observer: assignment and task management.
- Head Observer: observer assignment, task creation, and progress oversight.
- Security: participant scanning and entry records.
- Head team roles: relevant team-management controls.
- Delegation Owner/Member: delegation management or read-only membership view.

Legacy ATAGÇ routes receive temporary redirects to their new portal equivalents.

### Administration panel

Simplify navigation into grouped areas:

- Overview.
- Applications.
- People and Assignments.
- Committees and Delegations.
- Operations.
- Content.
- System.

Add:

- Application funnel and submissions-over-time charts.
- Application counts by type and status.
- Placement and committee-capacity charts.
- Payment, attendance, catering, observer-task, and ticket summaries.
- Per-user application matrix showing every submitted type.
- Explicit role and committee assignment action.
- Bulk filtering and review tools.
- Recipient preview before publishing announcements.
- Clear separation between participant assignments and Site Admin privileges.

Only Super Admins can assign Site Admin/Super Admin privileges or access the most sensitive settings.

### Announcements and email

- Preserve global, role, committee, and individual targeting.
- Publishing automatically emails the exact in-app target audience.
- Global announcements email every registered account.
- Recipient lists are deduplicated.
- An email-outbox worker sends in batches with retry and delivery status.
- Publication does not wait for all emails to finish.
- Use responsive RavenMUN email templates and a provider adapter, initially configured for Resend.
- Conference announcements are treated as mandatory operational communication.

### Visual direction

Use an original gothic academic/raven aesthetic without copying Nevermore branding directly.

Default design tokens:

- Background: `#08070D`.
- Elevated surface: `#12101A`.
- Primary purple: `#7C3AED`.
- Lilac: `#C4B5FD`.
- Silver: `#C3C7D1`.
- Main text: `#F5F3FF`.
- Muted text: `#9CA3AF`.

Visual treatment:

- Raven and castle silhouettes.
- Gothic arches, silver linework, layered gradients, and subtle atmospheric textures.
- Rich hero and section compositions rather than flat cards.
- Restrained animation and parallax with reduced-motion support.
- Cleaner spacing, fewer simultaneous controls, and contextual actions.
- Existing ATAGÇ icons/assets act as placeholders until replaced by RavenMUN assets.
- Continue using Recharts for meaningful portal and administrative graphics.

## Full-Parity Modules and Repairs

Carry over and complete:

- Profiles, privacy, digital IDs, and device management.
- Applications and dynamic form administration.
- Delegations and invitations.
- Committees, topics, resources, voting, and attendance.
- Collaborative editor and version history.
- Payments and receipt review.
- Connections.
- Announcements and email delivery.
- Catering.
- Gallery and Press uploads.
- Support tickets and attachments.
- Observer assignments and tasks.
- Security scanning and entry logs.
- Administrative settings, warnings, suspensions, and audit logs.

Repair rather than reproduce ATAGÇ defects:

- Enforce role hierarchy and prevent privilege escalation.
- Add committee ownership checks to voting, roll call, documents, and collaboration.
- Replace the broken catering/gallery schema assumptions.
- Implement missing member-permission and resource-deletion endpoints.
- Complete security scanning and logs.
- Correct targeted administrator payment uploads.
- Validate dynamic form answers server-side.
- Use transactions for multi-record operations.
- Return opaque server errors.
- Validate upload signatures, sizes, and counts.
- Align collaboration environment variables and deploy Hocuspocus separately.

## Interfaces and Deployment

### Primary routes

- Public: `/`, `/committees`, `/committees/[slug]`, `/team`, `/letters`, `/apply`, `/apply/[type]`, `/login`.
- Authenticated: `/portal/*`.
- Administration: `/admin/*`.

### Main API groups

- `/api/auth/challenges/*` — email OTP creation and verification.
- `/api/auth/device-codes/*` — trusted-device code creation and exchange.
- `/api/auth/sessions/*` — session listing and revocation.
- `/api/applications/*` — available forms, submission, listing, and review.
- `/api/admin/assignments/*` — primary role, head role, and committee placement.
- Existing committee, delegation, payment, announcement, resource, ticket, gallery, catering, observer, security, vote, roll-call, and document APIs are migrated behind the new authorization model.

All write payloads receive shared Zod schemas and resource-level authorization.

### Hosting

- Next.js application: Vercel.
- Database and storage: new RavenMUN Supabase project.
- Hocuspocus collaboration server: persistent worker service.
- Email outbox worker: separate process on the same worker platform.
- Email: Resend with verified RavenMUN sender domain.
- Shared rate limits: managed Redis-compatible service.
- Configuration is documented in a complete `.env.example`.

## Implementation Order

1. Rebrand configuration and establish real Supabase migrations.
2. Replace the account, role, application, and authorization models.
3. Implement passwordless OTP/device-code authentication.
4. Build the one-page multi-application experience.
5. Create the unified role-aware portal.
6. Redesign the administrative panel and assignment workflow.
7. Port the public SonMUN-style pages and editable content.
8. Migrate and repair every ATAGÇ parity module.
9. Add bulk announcement email processing.
10. Apply the RavenMUN visual system and responsive polish.
11. Complete security hardening, accessibility, tests, and deployment checks.

All phases are completed before public launch; the ordering is for implementation safety, not staggered feature release.

## Test and Acceptance Plan

- A new applicant submits a form, verifies email, receives an account/session, and reaches the portal.
- The same account submits several distinct application types but cannot duplicate one type.
- Submitted applications cannot be edited.
- Accepting an application does not grant permissions until explicit role assignment.
- A user can hold only one primary conference role.
- Delegation ownership remains available alongside the primary role.
- Delegation invitations are single-use, email-bound, and linked correctly.
- Email OTP and trusted-device login both create revocable one-year sessions.
- Role/committee authorization is tested for every portal and API module.
- Site Admin privilege assignment is restricted to Super Admin.
- Payment becomes available only after final placement and cannot duplicate.
- Announcement emails match global, role, committee, and individual audiences.
- Vote state, membership, option ownership, and duplicate voting are enforced.
- Roll-call, document, and collaboration access cannot cross committees.
- Upload validation, private URLs, and failed-write cleanup are tested.
- Every public, portal, and admin page is responsive and keyboard accessible.
- English copy, email templates, empty states, errors, charts, and mobile navigation are reviewed.
- CI runs TypeScript, ESLint, unit tests, API/integration tests, and a production build.

## Assumptions

- Implementation occurs in `C:\Desktop\atagc-dashboard`; `C:\Desktop\ravenmun` remains the planning-document directory.
- Existing ATAGÇ production data and secrets are not migrated or reused.
- SonMUN supplies the initial form structure and questions; all questions remain editable.
- Observer replaces SonMUN’s public Admin application.
- Security and head roles remain manually assigned internal roles.
- The interface is English-only.
- Sessions last one year for participants and administrators.
- Users receive one primary conference role.
- One payment is collected after placement.
- Submitted applications are final.
- Announcement publication always emails its exact target audience.
- RavenMUN logo/icon assets will replace placeholders later.
