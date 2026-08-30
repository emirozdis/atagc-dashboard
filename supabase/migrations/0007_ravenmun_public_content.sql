-- Editable public-site content for the RavenMUN website.
create table if not exists public.conference_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  is_published boolean not null default true,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conference_team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  bio text,
  image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.conference_pages (slug, title, excerpt, body)
values
  ('conference-information', 'Conference information', 'Dates, venue, and everything you need before RavenMUN.', '<p>Conference dates, venue details, payment instructions, and contact information will be published here.</p>'),
  ('welcome-letter', 'Welcome to RavenMUN', 'A note from the conference team.', '<p>Welcome to RavenMUN. We look forward to welcoming every delegate, chairboard member, press member, observer, and delegation.</p>'),
  ('contact', 'Contact RavenMUN', 'Reach the conference team.', '<p>For conference questions, contact the RavenMUN team through the details published by the organisers.</p>')
on conflict (slug) do nothing;

alter table public.conference_pages enable row level security;
alter table public.conference_team_members enable row level security;
