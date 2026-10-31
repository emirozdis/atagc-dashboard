-- Adds the "waitlist" review decision to the application status domain.
-- The live database stores applications.status as text with a check
-- constraint, so the constraint is replaced rather than an enum altered.

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'under_review', 'accepted', 'approved', 'waitlist', 'rejected', 'withdrawn'));
