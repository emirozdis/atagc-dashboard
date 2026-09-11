-- Shared rate limiting without a separate Redis service.

create table if not exists public.rate_limit_counters (
  key text primary key,
  window_started timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_counters_updated_at_idx
  on public.rate_limit_counters (updated_at);

alter table public.rate_limit_counters enable row level security;

revoke all on table public.rate_limit_counters from public, anon, authenticated;
grant all on table public.rate_limit_counters to service_role;

create or replace function public.consume_ravenmun_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if p_key is null or length(p_key) < 1 or length(p_key) > 200
    or p_limit is null or p_limit < 1
    or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  insert into public.rate_limit_counters (key, window_started, request_count, updated_at)
  values (p_key, now(), 1, now())
  on conflict (key) do update
  set request_count = case
      when rate_limit_counters.window_started <= now() - make_interval(secs => p_window_seconds)
        then 1
      else rate_limit_counters.request_count + 1
    end,
    window_started = case
      when rate_limit_counters.window_started <= now() - make_interval(secs => p_window_seconds)
        then now()
      else rate_limit_counters.window_started
    end,
    updated_at = now()
  returning request_count <= p_limit into v_allowed;

  -- Remove abandoned keys occasionally so long-running deployments do not
  -- retain one row forever for every address or account that ever connected.
  if random() < 0.01 then
    delete from public.rate_limit_counters
    where updated_at < now() - interval '1 day';
  end if;

  return v_allowed;
end;
$$;

revoke all on function public.consume_ravenmun_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_ravenmun_rate_limit(text, integer, integer)
  to service_role;
