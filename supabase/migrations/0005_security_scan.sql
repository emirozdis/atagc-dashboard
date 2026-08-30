create table if not exists public.security_entry_logs (
  id uuid primary key default gen_random_uuid(),
  scanned_user_id uuid not null references public.users(id) on delete cascade,
  scanned_by uuid not null references public.users(id) on delete restrict,
  scanned_at timestamptz not null default now(),
  result text not null default 'allowed',
  metadata jsonb not null default '{}'
);
create index if not exists security_entry_logs_time_idx on public.security_entry_logs(scanned_at desc);
