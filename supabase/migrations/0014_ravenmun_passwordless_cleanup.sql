-- Passwordless authentication is the only supported RavenMUN account flow.
-- Remove credentials and one-time tables belonging to the retired ATAGC flow
-- after verifying that no external compatibility process still depends on them.

alter table public.users drop column if exists password_hash;
drop table if exists public.password_resets;
drop table if exists public.email_verifications;
