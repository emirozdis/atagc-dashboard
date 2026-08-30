-- All application data is accessed through authenticated server routes using
-- the service role. Direct client access should remain unavailable by default.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ravenmun_settings', 'auth_challenges', 'auth_login_exchanges', 'active_sessions',
    'device_pairing_codes', 'application_forms', 'committees', 'payment_receipts',
    'delegation_invites', 'email_outbox', 'audit_logs', 'system_settings', 'high_schools',
    'user_consents', 'user_warnings', 'logs', 'email_verifications', 'password_resets',
    'committee_members', 'topics', 'committee_documents', 'document_versions', 'catering_logs',
    'resources', 'roll_calls', 'roll_call_logs', 'votes', 'vote_options', 'vote_responses',
    'tickets', 'ticket_messages', 'user_connections', 'observer_allocations', 'observer_tasks',
    'photo_areas', 'press_photos', 'security_entry_logs'
  ] loop
    execute format('alter table if exists public.%I enable row level security', table_name);
  end loop;
end $$;
