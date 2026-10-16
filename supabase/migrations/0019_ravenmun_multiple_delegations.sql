-- Allow a single account to lead several delegations and to submit more than
-- one delegation application.
--
-- Until now `applications` carried a blanket unique constraint on
-- (user_id, application_type) and `delegations` forced a single delegation per
-- owner and per creator. A leader who wanted to register a second delegation
-- therefore hit a database conflict that surfaced to the browser as a bare
-- "Internal Server Error".
--
-- Scope: only the `delegation` application type becomes repeatable. Delegate,
-- Chairboard, Press and Observer stay limited to one application per account,
-- which is enforced by a partial unique index below.

-- ---------------------------------------------------------------------------
-- 1. Applications: blanket unique -> partial unique that skips delegation
-- ---------------------------------------------------------------------------

alter table public.applications
  drop constraint if exists applications_user_id_application_type_key;

create unique index if not exists applications_user_id_application_type_unique
  on public.applications (user_id, application_type)
  where application_type <> 'delegation';

-- The blanket unique index also served lookups of "my application of this
-- type", so keep that access path indexed now that the unique index is gone.
create index if not exists applications_user_id_application_type_idx
  on public.applications (user_id, application_type, submitted_at desc);

-- ---------------------------------------------------------------------------
-- 2. Delegations: a leader may own and create several delegations
-- ---------------------------------------------------------------------------

alter table public.delegations
  drop constraint if exists delegations_owner_id_key;

drop index if exists public.delegations_created_by_unique_idx;

-- delegations.application_id stays unique: it is the authoritative link from a
-- delegation back to the application that created it, and the review flow
-- relies on it to find the correct leader application.
create index if not exists delegations_owner_id_idx
  on public.delegations (owner_id)
  where owner_id is not null;

create index if not exists delegations_created_by_idx
  on public.delegations (created_by)
  where created_by is not null;

-- ---------------------------------------------------------------------------
-- 3. submit_ravenmun_application: only block repeats for non-delegation types
-- ---------------------------------------------------------------------------

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

  -- A leader may register more than one delegation, so this guard applies to
  -- every application type except delegation.
  if p_application_type <> 'delegation' and exists (
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

-- ---------------------------------------------------------------------------
-- 4. create_ravenmun_delegation_invite: target a specific delegation
-- ---------------------------------------------------------------------------
--
-- The previous overloads resolved the delegation with
-- `where owner_id = p_owner_id`, which is ambiguous now that an owner can hold
-- several delegations. Both old overloads are dropped and replaced by a single
-- function that accepts p_delegation_id. When it is null the owner's most
-- recently created delegation is used, which keeps single-delegation callers
-- behaving exactly as before.

drop function if exists public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text);
drop function if exists public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text, text, text);

create or replace function public.create_ravenmun_delegation_invite(
  p_owner_id uuid,
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_link text,
  p_inviter_name text,
  p_subject text,
  p_html text,
  p_delegation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delegation public.delegations%rowtype;
  v_invite public.delegation_invites%rowtype;
begin
  if p_delegation_id is not null then
    select * into v_delegation
    from public.delegations
    where id = p_delegation_id
      and (owner_id = p_owner_id or created_by = p_owner_id)
    for update;
  else
    select * into v_delegation
    from public.delegations
    where owner_id = p_owner_id or created_by = p_owner_id
    order by created_at desc, id desc
    limit 1
    for update;
  end if;

  if not found then
    raise exception 'delegation not found' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.delegation_invites
    where delegation_id = v_delegation.id
      and lower(email) = lower(p_email)
      and used_at is null
      and expires_at > now()
  ) then
    raise exception 'an active invitation already exists for this email' using errcode = '23505';
  end if;

  if (select count(*) from public.delegation_invites where delegation_id = v_delegation.id and used_at is null and expires_at > now()) >= 100 then
    raise exception 'delegation invitation limit reached' using errcode = '22023';
  end if;

  insert into public.delegation_invites (delegation_id, delegation, email, token_hash, expires_at)
  values (v_delegation.id, v_delegation.id, lower(p_email), p_token_hash, p_expires_at)
  returning * into v_invite;

  insert into public.email_outbox (recipient_email, recipient_name, subject, html, related_invite_id)
  values (lower(p_email), p_inviter_name, coalesce(nullif(p_subject, ''), 'RavenMUN delegation invitation'), coalesce(nullif(p_html, ''), ''), v_invite.id);

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (p_owner_id, 'create_delegation_invite', 'delegation_invite', v_invite.id::text, jsonb_build_object('email', lower(p_email), 'delegation_id', v_delegation.id));

  return jsonb_build_object('id', v_invite.id, 'email', v_invite.email, 'expires_at', v_invite.expires_at);
end;
$$;

revoke all on function public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text, text, text, uuid) from public;
grant execute on function public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Read-side RLS: an owner must be able to list their own delegations
-- ---------------------------------------------------------------------------
--
-- There was no select policy on public.delegations at all, which meant an owner
-- could not read their own delegation rows as an authenticated client.

drop policy if exists "owners can read their own delegations" on public.delegations;

create policy "owners can read their own delegations"
  on public.delegations
  for select to authenticated
  using (owner_id = auth.uid() or created_by = auth.uid());