-- RavenMUN 2026 committee catalogue.
-- Keep this seed idempotent so it is safe to apply to an existing database.
insert into public.committees (name, slug, is_published)
values
  ('TKK 1. SELİM DÖNEMİ', 'tkk-1-selim-donemi', true),
  ('JCC THE FINNISH WAR', 'jcc-the-finnish-war', true),
  ('UNODC', 'unodc', true),
  ('UNSC', 'unsc', true),
  ('COUNCIL OF OLYMPUS', 'council-of-olympus', true),
  ('UNDP', 'undp', true),
  ('UNHRC', 'unhrc', true),
  ('FRANKFURTER NATIONALVERSAMMLUNG', 'frankfurter-nationalversammlung', true),
  ('UNWOMEN', 'unwomen', true)
on conflict (slug) do update
set name = excluded.name,
    is_published = excluded.is_published,
    updated_at = now();
