-- Configurable notification templates and an admin-only inbound email archive.

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null unique,
  subject text not null,
  heading text not null,
  body_html text not null,
  button_text text,
  button_path text,
  accent_color text,
  is_enabled boolean not null default true,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.received_emails (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null unique,
  webhook_event_id text unique,
  from_address text not null,
  to_addresses jsonb not null default '[]'::jsonb,
  cc_addresses jsonb not null default '[]'::jsonb,
  bcc_addresses jsonb not null default '[]'::jsonb,
  reply_to_addresses jsonb not null default '[]'::jsonb,
  subject text not null,
  text_body text,
  html_body text,
  headers jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  message_id text,
  received_at timestamptz not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists received_emails_received_at_idx
  on public.received_emails (received_at desc);
create index if not exists received_emails_unread_idx
  on public.received_emails (is_read, received_at desc);

alter table public.email_templates enable row level security;
alter table public.received_emails enable row level security;

alter table public.email_outbox
  add column if not exists related_invite_id uuid references public.delegation_invites(id) on delete set null;

create index if not exists email_outbox_related_invite_idx
  on public.email_outbox (related_invite_id);

-- The extended overload lets invitation email templates be customized while
-- retaining the existing six-argument RPC for older callers.
create or replace function public.create_ravenmun_delegation_invite(
  p_owner_id uuid,
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_link text,
  p_inviter_name text,
  p_subject text,
  p_html text
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

  insert into public.email_outbox (recipient_email, recipient_name, subject, html, related_invite_id)
  values (lower(p_email), p_inviter_name, coalesce(nullif(p_subject, ''), 'RavenMUN delegation invitation'), coalesce(nullif(p_html, ''), ''), v_invite.id);

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (p_owner_id, 'create_delegation_invite', 'delegation_invite', v_invite.id::text, jsonb_build_object('email', lower(p_email), 'delegation_id', v_delegation.id));

  return jsonb_build_object('id', v_invite.id, 'email', v_invite.email, 'expires_at', v_invite.expires_at);
end;
$$;

revoke all on function public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_ravenmun_delegation_invite(uuid, text, text, timestamptz, text, text, text, text) to service_role;
