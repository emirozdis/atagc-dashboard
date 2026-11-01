-- Participation fees are live prices. Bring every application snapshot in line
-- with its form's current fee and restore unpaid status for accepted rows that
-- still carry the old automatic exemption.

update public.applications a
set form_snapshot = jsonb_set(coalesce(a.form_snapshot, '{}'::jsonb), '{fee}', to_jsonb(f.fee), true),
    updated_at = now()
from public.application_forms f
where f.id = a.form_id
  and (
    a.form_snapshot is null
    or a.form_snapshot ->> 'fee' is null
    or (a.form_snapshot ->> 'fee')::numeric <> f.fee
  );

update public.applications a
set payment_status = 'unpaid', updated_at = now()
where a.status in ('accepted', 'approved')
  and a.payment_status = 'exempt'
  and coalesce(
    (a.form_snapshot ->> 'fee')::numeric,
    (select f.fee from public.application_forms f where f.id = a.form_id),
    0
  ) > 0;
