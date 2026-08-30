-- Private buckets used by server-side upload and signed-download routes.
insert into storage.buckets (id, name, public)
values
  ('receipts', 'receipts', false),
  ('profile-pictures', 'profile-pictures', false),
  ('resources', 'resources', false),
  ('tickets', 'tickets', false),
  ('ticket-attachments', 'ticket-attachments', false),
  ('press-photos', 'press-photos', false),
  ('gallery', 'gallery', false)
on conflict (id) do update set public = false;
