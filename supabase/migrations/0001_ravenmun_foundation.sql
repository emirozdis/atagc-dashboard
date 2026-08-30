-- RavenMUN foundation schema.
-- Apply this migration to a new RavenMUN Supabase project only.

create extension if not exists pgcrypto;

create table if not exists public.ravenmun_settings (
  id boolean primary key default true check (id = true),
  conference_name text not null default 'RavenMUN',
  conference_year integer not null default 2026,
  location text,
  site_url text,
  event_start_date timestamptz,
  event_end_date timestamptz,
  applications_open boolean not null default true,
  maintenance_mode boolean not null default false,
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.ravenmun_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null default '',
  -- Legacy column retained while ATAGC feature modules are migrated.
  role text not null default 'applicant',
  account_role text not null default 'member' check (account_role in ('member', 'site_admin', 'super_admin')),
  password_hash text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  phone_number text,
  birth_date date,
  national_id text,
  gender text,
  school text,
  city text,
  grade text,
  profile_picture_url text,
  is_profile_picture_hidden boolean not null default false,
  allow_connections boolean not null default true,
  notification_preferences jsonb not null default '{"application":true,"committee":true,"social":true,"system":true}'::jsonb,
  additional_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('application', 'login', 'device_pairing')),
  code_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_challenges_email_created_idx
  on public.auth_challenges (email, created_at desc);

create table if not exists public.auth_login_exchanges (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  user_agent text,
  ip_address text,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year'),
  revoked_at timestamptz
);

create index if not exists active_sessions_user_idx on public.active_sessions (user_id, created_at desc);

create table if not exists public.device_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  creator_session_id uuid not null references public.active_sessions(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.application_forms (
  id uuid primary key default gen_random_uuid(),
  application_type text not null unique check (application_type in ('delegate', 'chairboard', 'delegation', 'press', 'observer')),
  slug text not null unique,
  title text not null,
  description text,
  fee numeric not null default 0,
  steps jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  application_type text not null check (application_type in ('delegate', 'chairboard', 'delegation', 'press', 'observer')),
  form_id uuid references public.application_forms(id) on delete restrict,
  form_version integer not null default 1,
  form_snapshot jsonb not null default '{}'::jsonb,
  form_data jsonb not null default '{}'::jsonb,
  -- Both the new workflow and the legacy feature modules use these states while
  -- the migration is being completed. The admin UI will present accepted as
  -- approved once the review module is migrated.
  status text not null default 'pending' check (status in ('pending', 'under_review', 'accepted', 'approved', 'rejected', 'withdrawn')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'processing', 'paid', 'rejected', 'exempt')),
  review_notes text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, application_type)
);

create index if not exists applications_status_type_idx on public.applications (status, application_type, submitted_at desc);

create table if not exists public.committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  documents jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conference_assignments (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null check (role in ('delegate', 'committee_chairman', 'chair', 'press', 'head_press', 'observer', 'head_observer', 'security', 'head_security')),
  committee_id uuid references public.committees(id) on delete set null,
  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create index if not exists conference_assignments_role_idx on public.conference_assignments (role, committee_id);

create table if not exists public.delegations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  application_id uuid unique references public.applications(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delegation_members (
  delegation_id uuid not null references public.delegations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  accepted boolean not null default false,
  joined_at timestamptz,
  primary key (delegation_id, user_id)
);

create table if not exists public.delegation_invites (
  id uuid primary key default gen_random_uuid(),
  delegation_id uuid not null references public.delegations(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  storage_path text not null,
  file_type text,
  status text not null default 'unpaid' check (status in ('not_required', 'unpaid', 'processing', 'paid', 'rejected', 'exempt')),
  admin_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author_id uuid references public.users(id) on delete set null,
  target_type text not null check (target_type in ('all', 'role', 'committee', 'user')),
  target_roles text[] not null default '{}',
  target_committee_ids uuid[] not null default '{}',
  target_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_recipients (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emailed_at timestamptz,
  primary key (announcement_id, user_id)
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  html text not null,
  related_announcement_id uuid references public.announcements(id) on delete set null,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.user_details enable row level security;
alter table public.applications enable row level security;
alter table public.conference_assignments enable row level security;
alter table public.delegations enable row level security;
alter table public.delegation_members enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_recipients enable row level security;

create policy "users can read their own profile" on public.users
  for select to authenticated using (id = auth.uid());
create policy "users can read their own details" on public.user_details
  for select to authenticated using (user_id = auth.uid());
create policy "users can read their own applications" on public.applications
  for select to authenticated using (user_id = auth.uid());
create policy "users can read their own assignment" on public.conference_assignments
  for select to authenticated using (user_id = auth.uid());
create policy "users can read their own delegation membership" on public.delegation_members
  for select to authenticated using (user_id = auth.uid());
create policy "users can read announcement recipients" on public.announcement_recipients
  for select to authenticated using (user_id = auth.uid());
