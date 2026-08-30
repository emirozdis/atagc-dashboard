-- Supabase projects can grant EXECUTE to anon/authenticated through default
-- privileges. Revoke those explicit grants from every RavenMUN SECURITY
-- DEFINER workflow and leave them available only to the server service role.

revoke all on function public.claim_ravenmun_email_outbox(integer, text)
  from public, anon, authenticated;
grant execute on function public.claim_ravenmun_email_outbox(integer, text)
  to service_role;

revoke all on function public.submit_ravenmun_application(
  uuid, text, text, uuid, integer, jsonb, jsonb, uuid, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.submit_ravenmun_application(
  uuid, text, text, uuid, integer, jsonb, jsonb, uuid, uuid, uuid, text
) to service_role;

revoke all on function public.assign_ravenmun_conference_role(
  uuid[], text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.assign_ravenmun_conference_role(
  uuid[], text, uuid, uuid
) to service_role;

revoke all on function public.publish_ravenmun_announcement(
  text, text, uuid, text, text[], uuid[], uuid[], jsonb
) from public, anon, authenticated;
grant execute on function public.publish_ravenmun_announcement(
  text, text, uuid, text, text[], uuid[], uuid[], jsonb
) to service_role;

revoke all on function public.increment_ravenmun_auth_attempt(uuid)
  from public, anon, authenticated;
grant execute on function public.increment_ravenmun_auth_attempt(uuid)
  to service_role;

revoke all on function public.submit_ravenmun_payment_receipt(
  uuid, uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.submit_ravenmun_payment_receipt(
  uuid, uuid, text, text, uuid
) to service_role;

revoke all on function public.create_ravenmun_delegation_invite(
  uuid, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.create_ravenmun_delegation_invite(
  uuid, text, text, timestamptz, text, text
) to service_role;
