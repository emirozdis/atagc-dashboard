-- Atomic role and committee assignment for bulk administrator actions.

create or replace function public.assign_ravenmun_conference_role(
  p_user_ids uuid[],
  p_role text,
  p_committee_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception 'at least one user is required' using errcode = '22023';
  end if;

  if p_role not in ('applicant', 'delegate', 'committee_chairman', 'chair', 'press', 'head_press', 'observer', 'head_observer', 'security', 'head_security') then
    raise exception 'invalid conference role' using errcode = '22023';
  end if;

  if exists (select 1 from unnest(p_user_ids) as requested(id) left join public.users u on u.id = requested.id where u.id is null) then
    raise exception 'one or more users do not exist' using errcode = '22023';
  end if;

  if exists (select 1 from public.users where id = any(p_user_ids) and account_role <> 'member') then
    raise exception 'site administrator accounts cannot receive conference assignments' using errcode = '42501';
  end if;

  if p_role = 'applicant' then
    delete from public.conference_assignments where user_id = any(p_user_ids);
    delete from public.committee_members where user_id = any(p_user_ids);
  else
    insert into public.conference_assignments (user_id, role, committee_id, assigned_by, assigned_at)
    select id, p_role, p_committee_id, p_actor_id, now()
    from unnest(p_user_ids) as requested(id)
    on conflict (user_id) do update set
      role = excluded.role,
      committee_id = excluded.committee_id,
      assigned_by = excluded.assigned_by,
      assigned_at = excluded.assigned_at;
  end if;

  update public.users
  set role = p_role, account_role = 'member', updated_at = now()
  where id = any(p_user_ids);

  insert into public.audit_logs (user_id, action, resource_type, metadata)
  values (p_actor_id, 'assign_role', 'conference_assignment', jsonb_build_object('user_ids', p_user_ids, 'role', p_role, 'committee_id', p_committee_id));
end;
$$;

revoke all on function public.assign_ravenmun_conference_role(uuid[], text, uuid, uuid) from public;
grant execute on function public.assign_ravenmun_conference_role(uuid[], text, uuid, uuid) to service_role;
