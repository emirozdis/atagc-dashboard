-- The receipt review workflow stores an accepted receipt as 'approved'
-- (see ReceiptStatusEnum and the admin payments UI), while the earlier
-- compatibility constraint only accepted the application payment vocabulary.
-- Keep the legacy values for compatibility and allow the workflow value.

alter table public.payment_receipts
  drop constraint if exists payment_receipts_status_check;

alter table public.payment_receipts
  add constraint payment_receipts_status_check
  check (status in ('pending', 'approved', 'rejected', 'not_required', 'unpaid', 'processing', 'paid', 'exempt'));
