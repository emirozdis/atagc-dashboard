alter table public.email_outbox
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text;

create or replace function public.claim_ravenmun_email_outbox(p_limit integer default 25, p_worker text default 'worker')
returns setof public.email_outbox
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.email_outbox
    where sent_at is null
      and attempts < 10
      and available_at <= now()
      and (locked_at is null or locked_at < now() - interval '10 minutes')
    order by created_at asc
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.email_outbox outbox
  set locked_at = now(), locked_by = p_worker
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
$$;
