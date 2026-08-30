-- Atomically count failed OTP attempts so concurrent guesses cannot bypass the limit.

create or replace function public.increment_ravenmun_auth_attempt(p_challenge_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  update public.auth_challenges
  set attempts = attempts + 1
  where id = p_challenge_id
    and consumed_at is null
    and attempts < 10
  returning attempts into v_attempts;

  if v_attempts is null then
    raise exception 'invalid or expired verification code' using errcode = '22023';
  end if;
  return v_attempts;
end;
$$;

revoke all on function public.increment_ravenmun_auth_attempt(uuid) from public;
grant execute on function public.increment_ravenmun_auth_attempt(uuid) to service_role;
