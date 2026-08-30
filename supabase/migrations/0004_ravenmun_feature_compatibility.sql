-- Compatibility layer for ATAGC feature modules while their pages are moved
-- into the RavenMUN portal. New RavenMUN routes use the normalized tables from
-- 0001; these tables preserve the existing committee/event workflows.

alter table public.application_forms alter column application_type set default 'delegate';
alter table public.applications alter column application_type set default 'delegate';
alter table public.applications add column if not exists delegation_id uuid references public.delegations(id) on delete set null;
alter table public.committees alter column slug set default ('committee-' || substr(gen_random_uuid()::text, 1, 8));
alter table public.committees alter column slug drop not null;
alter table public.user_details add column if not exists high_school_id bigint;
alter table public.committees add column if not exists admin_id uuid references public.users(id) on delete set null;
alter table public.announcements add column if not exists is_public boolean not null default true;
alter table public.announcements add column if not exists committee_ids uuid[] not null default '{}';
alter table public.payment_receipts add column if not exists application_id uuid references public.applications(id) on delete set null;
alter table public.delegations add column if not exists created_by uuid references public.users(id) on delete set null;
alter table public.delegations alter column owner_id drop not null;
alter table public.delegation_members add column if not exists delegation uuid references public.delegations(id) on delete cascade;
alter table public.delegation_invites add column if not exists delegation uuid references public.delegations(id) on delete cascade;
alter table public.delegation_invites add column if not exists invite_code text default encode(gen_random_bytes(6), 'hex');
alter table public.delegation_invites add column if not exists uses_left smallint default 0;
alter table public.delegation_invites alter column delegation_id drop not null;
alter table public.delegation_invites alter column email drop not null;
alter table public.delegation_invites alter column token_hash drop not null;
alter table public.delegation_invites alter column expires_at drop not null;

create table if not exists public.delegation_magiclinks (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), delegation uuid not null references public.delegations(id) on delete cascade, sent_to text not null, is_used boolean not null default false
);

create unique index if not exists delegations_created_by_unique_idx on public.delegations(created_by) where created_by is not null;

create or replace function public.sync_ravenmun_delegation_compatibility()
returns trigger language plpgsql as $$
begin
  if new.owner_id is null then new.owner_id := new.created_by; end if;
  if new.created_by is null then new.created_by := new.owner_id; end if;
  return new;
end;
$$;
drop trigger if exists sync_ravenmun_delegations on public.delegations;
create trigger sync_ravenmun_delegations before insert or update on public.delegations for each row execute function public.sync_ravenmun_delegation_compatibility();

create or replace function public.sync_ravenmun_delegation_members_compatibility()
returns trigger language plpgsql as $$
begin
  if new.delegation_id is null then new.delegation_id := new.delegation; end if;
  if new.delegation is null then new.delegation := new.delegation_id; end if;
  return new;
end;
$$;
drop trigger if exists sync_ravenmun_delegation_members on public.delegation_members;
create trigger sync_ravenmun_delegation_members before insert or update on public.delegation_members for each row execute function public.sync_ravenmun_delegation_members_compatibility();

create or replace function public.sync_ravenmun_delegation_invites_compatibility()
returns trigger language plpgsql as $$
begin
  if new.delegation_id is null then new.delegation_id := new.delegation; end if;
  if new.delegation is null then new.delegation := new.delegation_id; end if;
  return new;
end;
$$;
drop trigger if exists sync_ravenmun_delegation_invites on public.delegation_invites;
create trigger sync_ravenmun_delegation_invites before insert or update on public.delegation_invites for each row execute function public.sync_ravenmun_delegation_invites_compatibility();

create or replace function public.sync_ravenmun_committee_assignment_compatibility()
returns trigger language plpgsql as $$
begin
  delete from public.committee_members where user_id = new.user_id;
  if new.committee_id is not null and new.role in ('delegate', 'committee_chairman', 'chair') then
    insert into public.committee_members (committee_id, user_id, can_write)
    values (new.committee_id, new.user_id, new.role in ('committee_chairman', 'chair'))
    on conflict (committee_id, user_id) do update set can_write = excluded.can_write;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_ravenmun_committee_assignments on public.conference_assignments;
create trigger sync_ravenmun_committee_assignments after insert or update on public.conference_assignments for each row execute function public.sync_ravenmun_committee_assignment_compatibility();

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  applications_open boolean default true,
  maintenance_mode boolean default false,
  term_name text default 'RavenMUN 2026',
  contact_email text default 'info@ravenmun.org',
  event_start_date timestamptz,
  event_end_date timestamptz,
  location text,
  bank_name text,
  bank_account_holder text,
  bank_iban text,
  gallery_enabled boolean default true,
  updated_at timestamptz default now()
);
insert into public.system_settings (applications_open, maintenance_mode, term_name, contact_email, gallery_enabled)
select true, false, 'RavenMUN 2026', 'info@ravenmun.org', true
where not exists (select 1 from public.system_settings);

create table if not exists public.high_schools (
  id bigint generated always as identity primary key,
  city text not null,
  district text not null default '',
  school_name text not null,
  address text
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  consent_type text not null, consent_version text not null, ip_address text, user_agent text, action text not null, created_at timestamptz not null default now()
);
create table if not exists public.user_warnings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  issued_by uuid not null references public.users(id) on delete restrict, reason text not null, category text not null default 'other', created_at timestamptz default now()
);
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id) on delete set null, action text not null,
  details jsonb default '{}', ip_address text, user_agent text, created_at timestamptz default now(), severity text default 'info', category text default 'system', resource_id uuid, resource_type text
);
create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(), email text not null, code text not null, expires_at timestamptz not null, verified boolean default false, created_at timestamptz default now()
);
alter table public.email_verifications add column if not exists code_hash text;
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(), email text not null, token_hash text not null, expires_at timestamptz not null, created_at timestamptz default now(), used boolean default false
);

create table if not exists public.committee_members (
  id uuid primary key default gen_random_uuid(), committee_id uuid references public.committees(id) on delete cascade, user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(), can_write boolean default false
);
create unique index if not exists committee_members_unique_idx on public.committee_members(committee_id, user_id);
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(), committee_id uuid references public.committees(id) on delete cascade, title text not null, description text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.committee_documents (
  id uuid primary key default gen_random_uuid(), committee_id uuid unique references public.committees(id) on delete cascade, document_blob bytea, is_locked boolean default false, updated_at timestamptz default now()
);
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(), committee_id uuid not null references public.committees(id) on delete cascade, document_blob bytea not null, created_at timestamptz default now(), created_by uuid references public.users(id) on delete set null, version_name text, is_auto_save boolean default false
);

create table if not exists public.catering_logs (
  id bigint generated always as identity primary key, user_id uuid references public.users(id) on delete cascade, datetime timestamptz, created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), day1 boolean default false, day2 boolean default false, day3 boolean default false
);
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(), title text not null, description text, file_url text not null, file_type text, category text not null default 'general', uploaded_by uuid references public.users(id) on delete set null,
  is_public boolean default false, created_at timestamptz default now(), committee_id uuid references public.committees(id) on delete set null, storage_path text
);

create table if not exists public.roll_calls (
  id uuid primary key default gen_random_uuid(), committee_id uuid references public.committees(id) on delete cascade, session_name text not null, qr_code text not null unique, session_date timestamptz, created_at timestamptz default now(), secret_key text
);
create table if not exists public.roll_call_logs (
  id uuid primary key default gen_random_uuid(), roll_call_id uuid references public.roll_calls(id) on delete cascade, user_id uuid references public.users(id) on delete cascade, scanned_at timestamptz default now()
);
create unique index if not exists roll_call_logs_unique_scan_idx on public.roll_call_logs(roll_call_id, user_id);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(), committee_id uuid not null references public.committees(id) on delete cascade, title text not null, status text not null default 'open', created_at timestamptz default now()
);
create table if not exists public.vote_options (
  id uuid primary key default gen_random_uuid(), vote_id uuid not null references public.votes(id) on delete cascade, label text not null
);
create table if not exists public.vote_responses (
  id uuid primary key default gen_random_uuid(), vote_id uuid not null references public.votes(id) on delete cascade, option_id uuid not null references public.vote_options(id) on delete cascade, user_id uuid not null references public.users(id) on delete cascade, created_at timestamptz default now()
);
create unique index if not exists vote_responses_one_per_user_idx on public.vote_responses(vote_id, user_id);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id) on delete set null, is_anonymous boolean not null default false, access_token uuid default gen_random_uuid(), category text not null default 'general', subject text not null, status text not null default 'submitted', created_at timestamptz not null default now(), updated_at timestamptz default now()
);
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade, sender_id uuid references public.users(id) on delete set null, is_staff_reply boolean not null default false, message text not null default '', attachments jsonb default '[]', created_at timestamptz not null default now()
);
create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(), requester_id uuid not null references public.users(id) on delete cascade, recipient_id uuid not null references public.users(id) on delete cascade, status text not null default 'pending', created_at timestamptz default now(), updated_at timestamptz default now(), note text
);
create unique index if not exists user_connections_pair_idx on public.user_connections(requester_id, recipient_id);

create table if not exists public.observer_allocations (
  id uuid primary key references public.users(id) on delete cascade, allocated_committee uuid references public.committees(id) on delete set null, allocated_field text, field_observer boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.observer_tasks (
  id bigint generated always as identity primary key, assigned_by uuid references public.users(id) on delete set null, assigned_to uuid references public.users(id) on delete cascade, assigned_task text, assigned_committee uuid references public.committees(id) on delete set null, created_at timestamptz default now(), status text not null default 'created', task_description text
);

create table if not exists public.photo_areas (
  id uuid primary key default gen_random_uuid(), name text not null, description text, created_at timestamptz default now()
);
create table if not exists public.press_photos (
  id uuid primary key default gen_random_uuid(), uploaded_by uuid references public.users(id) on delete set null, area_id uuid references public.photo_areas(id) on delete set null, storage_path text not null, title text, description text, status text not null default 'pending', created_at timestamptz default now()
);

alter table public.payment_receipts drop constraint if exists payment_receipts_status_check;
alter table public.payment_receipts add constraint payment_receipts_status_check check (status in ('pending', 'not_required', 'unpaid', 'processing', 'paid', 'rejected', 'exempt'));
alter table public.ticket_messages alter column message set default '';
