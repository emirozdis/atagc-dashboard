-- Create a delegation invitation and durable email job in one transaction.

create or replace function public.create_ravenmun_delegation_invite(
  p_owner_id uuid,
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_link text,
  p_inviter_name text
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
  select * into v_delegation
  from public.delegations
  where owner_id = p_owner_id
  for update;

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

  insert into public.email_outbox (recipient_email, recipient_name, subject, html)
  values (
    lower(p_email),
    p_inviter_name,
    'RavenMUN delegation invitation',
    '<!doctype html><html lang="en"><body style="margin:0;background:#08070d;color:#f5f3ff;font-family:Arial,sans-serif;padding:32px"><div style="max-width:560px;margin:auto;background:#12101a;border:1px solid #332b49;border-radius:18px;padding:32px"><p style="color:#c4b5fd;letter-spacing:.2em;text-transform:uppercase;font-size:12px">RavenMUN delegation</p><h1>You have been invited.</h1><p style="color:#c3c7d1;line-height:1.7">' || replace(replace(replace(replace(replace(p_inviter_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;') || ' invited you to join their delegation. Verify your email and complete your own Delegate application to join RavenMUN.</p><a href="' || replace(replace(replace(p_link, '&', '&amp;'), '"', '&quot;'), '<', '&lt;') || '" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px">Join the delegation</a><p style="color:#9ca3af;font-size:12px;margin-top:28px">This invitation expires in seven days.</p></div></body></html>'
  );

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (p_owner_id, 'create_delegation_invite', 'delegation_invite', v_invite.id::text, jsonb_build_object('email', lower(p_email), 'delegation_id', v_delegation.id));

  return jsonb_build_object('id', v_invite.id, 'email', v_invite.email, 'expires_at', v_invite.expires_at);
end;
$$;

revoke all on function public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text) from public;
grant execute on function public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text) to service_role;
