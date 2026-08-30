-- Atomic business workflows for the new RavenMUN application model.
-- These functions are called only by server routes using the service role.

create or replace function public.submit_ravenmun_application(
  p_user_id uuid,
  p_email text,
  p_application_type text,
  p_form_id uuid,
  p_form_version integer,
  p_form_snapshot jsonb,
  p_form_data jsonb,
  p_delegation_id uuid default null,
  p_invite_id uuid default null,
  p_magiclink_id uuid default null,
  p_delegation_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_delegation_id uuid := p_delegation_id;
  v_invite_delegation_id uuid;
  v_magiclink_delegation_id uuid;
  v_now timestamptz := now();
  v_name text;
begin
  if p_application_type not in ('delegate', 'chairboard', 'delegation', 'press', 'observer') then
    raise exception 'invalid application type' using errcode = '22023';
  end if;

  if not exists (select 1 from public.users where id = p_user_id and lower(email) = lower(p_email) and is_suspended = false) then
    raise exception 'account is unavailable' using errcode = '42501';
  end if;

  if not exists (select 1 from public.application_forms where id = p_form_id and application_type = p_application_type) then
    raise exception 'application form does not match application type' using errcode = '22023';
  end if;

  if p_invite_id is not null and p_magiclink_id is not null then
    raise exception 'multiple delegation invitations are not allowed' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.applications
    where user_id = p_user_id and application_type = p_application_type
  ) then
    raise exception 'application type already submitted' using errcode = '23505';
  end if;

  if p_invite_id is not null then
    update public.delegation_invites
    set used_at = v_now
    where id = p_invite_id
      and used_at is null
      and expires_at > v_now
      and lower(email) = lower(p_email)
    returning delegation_id into v_invite_delegation_id;

    if v_invite_delegation_id is null then
      raise exception 'delegation invitation is invalid' using errcode = '22023';
    end if;
    v_delegation_id := v_invite_delegation_id;
  elsif p_magiclink_id is not null then
    update public.delegation_magiclinks
    set is_used = true
    where id = p_magiclink_id
      and is_used = false
      and lower(sent_to) = lower(p_email)
    returning delegation into v_magiclink_delegation_id;

    if v_magiclink_delegation_id is null then
      raise exception 'delegation invitation is invalid' using errcode = '22023';
    end if;
    v_delegation_id := v_magiclink_delegation_id;
  end if;

  insert into public.applications (
    user_id, application_type, delegation_id, form_id, form_version,
    form_snapshot, form_data, status, payment_status, submitted_at, updated_at
  ) values (
    p_user_id, p_application_type, v_delegation_id, p_form_id, p_form_version,
    p_form_snapshot, p_form_data, 'pending', 'unpaid', v_now, v_now
  ) returning * into v_application;

  v_name := nullif(trim(coalesce(p_form_data ->> 'fullName', '')), '');
  update public.users
  set full_name = coalesce(v_name, full_name), updated_at = v_now
  where id = p_user_id;

  insert into public.user_details (
    user_id, phone_number, school, city, grade, additional_info, updated_at
  ) values (
    p_user_id,
    nullif(p_form_data ->> 'phone', ''),
    nullif(p_form_data ->> 'school', ''),
    nullif(p_form_data ->> 'city', ''),
    nullif(p_form_data ->> 'grade', ''),
    p_form_data,
    v_now
  )
  on conflict (user_id) do update set
    phone_number = coalesce(excluded.phone_number, user_details.phone_number),
    school = coalesce(excluded.school, user_details.school),
    city = coalesce(excluded.city, user_details.city),
    grade = coalesce(excluded.grade, user_details.grade),
    additional_info = coalesce(user_details.additional_info, '{}'::jsonb) || coalesce(excluded.additional_info, '{}'::jsonb),
    updated_at = v_now;

  if p_application_type = 'delegation' then
    insert into public.delegations (owner_id, name, application_id, created_by)
    values (
      p_user_id,
      coalesce(nullif(trim(p_delegation_name), ''), 'RavenMUN Delegation'),
      v_application.id,
      p_user_id
    );
  elsif v_delegation_id is not null then
    insert into public.delegation_members (delegation_id, delegation, user_id, accepted, joined_at)
    values (v_delegation_id, v_delegation_id, p_user_id, true, v_now)
    on conflict (delegation_id, user_id) do update set
      accepted = true,
      joined_at = coalesce(public.delegation_members.joined_at, excluded.joined_at);
  end if;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (
    p_user_id,
    'submit_application',
    'application',
    v_application.id::text,
    jsonb_build_object('application_type', p_application_type, 'form_version', p_form_version)
  );

  return jsonb_build_object(
    'id', v_application.id,
    'application_type', v_application.application_type,
    'status', v_application.status,
    'submitted_at', v_application.submitted_at
  );
end;
$$;

revoke all on function public.submit_ravenmun_application(uuid, text, text, uuid, integer, jsonb, jsonb, uuid, uuid, uuid, text) from public;
grant execute on function public.submit_ravenmun_application(uuid, text, text, uuid, integer, jsonb, jsonb, uuid, uuid, uuid, text) to service_role;
