-- Publish announcements, recipients, outbox messages, and audit records atomically.

create or replace function public.publish_ravenmun_announcement(
  p_title text,
  p_content text,
  p_author_id uuid,
  p_target_type text,
  p_target_roles text[],
  p_committee_ids uuid[],
  p_user_ids uuid[],
  p_recipients jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_announcement_id uuid;
begin
  if p_target_type not in ('all', 'role', 'committee', 'user') then
    raise exception 'invalid announcement target' using errcode = '22023';
  end if;

  insert into public.announcements (
    title, content, author_id, target_type, target_roles,
    target_committee_ids, target_user_ids
  ) values (
    p_title, p_content, p_author_id, p_target_type,
    coalesce(p_target_roles, '{}'),
    coalesce(p_committee_ids, '{}'),
    coalesce(p_user_ids, '{}')
  ) returning id into v_announcement_id;

  insert into public.announcement_recipients (announcement_id, user_id)
  select v_announcement_id, (recipient ->> 'id')::uuid
  from jsonb_array_elements(coalesce(p_recipients, '[]'::jsonb)) as entries(recipient)
  on conflict (announcement_id, user_id) do nothing;

  insert into public.email_outbox (
    recipient_email, recipient_name, subject, html, related_announcement_id
  )
  select
    recipient ->> 'email',
    recipient ->> 'full_name',
    'RavenMUN: ' || p_title,
    recipient ->> 'html',
    v_announcement_id
  from jsonb_array_elements(coalesce(p_recipients, '[]'::jsonb)) as entries(recipient)
  where nullif(recipient ->> 'email', '') is not null;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (
    p_author_id,
    'create_announcement',
    'announcement',
    v_announcement_id::text,
    jsonb_build_object('target_type', p_target_type, 'recipient_count', jsonb_array_length(coalesce(p_recipients, '[]'::jsonb)))
  );

  return v_announcement_id;
end;
$$;

revoke all on function public.publish_ravenmun_announcement(text, text, uuid, text, text[], uuid[], uuid[], jsonb) from public;
grant execute on function public.publish_ravenmun_announcement(text, text, uuid, text, text[], uuid[], uuid[], jsonb) to service_role;
