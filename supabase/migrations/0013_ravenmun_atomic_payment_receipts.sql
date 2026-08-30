-- Atomically register a payment receipt and move all accepted placements to processing.

create or replace function public.submit_ravenmun_payment_receipt(
  p_user_id uuid,
  p_application_id uuid,
  p_storage_path text,
  p_file_type text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.payment_receipts%rowtype;
  v_previous_path text;
begin
  perform 1
  from public.applications
  where user_id = p_user_id
    and id = p_application_id
    and status in ('accepted', 'approved')
  for update;

  if not found or not exists (select 1 from public.conference_assignments where user_id = p_user_id) then
    raise exception 'payment is available after final placement' using errcode = '42501';
  end if;

  if exists (select 1 from public.payment_receipts where user_id = p_user_id and status in ('paid', 'processing')) then
    raise exception 'payment already submitted or completed' using errcode = '23505';
  end if;

  select storage_path into v_previous_path
  from public.payment_receipts
  where user_id = p_user_id
  for update;

  insert into public.payment_receipts (
    user_id, application_id, storage_path, file_type, status, updated_at
  ) values (
    p_user_id, p_application_id, p_storage_path, p_file_type, 'pending', now()
  )
  on conflict (user_id) do update set
    application_id = excluded.application_id,
    storage_path = excluded.storage_path,
    file_type = excluded.file_type,
    status = 'pending',
    admin_note = null,
    reviewed_by = null,
    reviewed_at = null,
    updated_at = now()
  returning * into v_receipt;

  update public.applications
  set payment_status = 'processing', updated_at = now()
  where user_id = p_user_id and status in ('accepted', 'approved');

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (p_actor_id, 'upload_payment_receipt', 'payment_receipt', v_receipt.id::text, jsonb_build_object('target_user_id', p_user_id, 'storage_path', p_storage_path));

  return jsonb_build_object('id', v_receipt.id, 'previous_storage_path', v_previous_path);
end;
$$;

revoke all on function public.submit_ravenmun_payment_receipt(uuid, uuid, text, text, uuid) from public;
grant execute on function public.submit_ravenmun_payment_receipt(uuid, uuid, text, text, uuid) to service_role;
