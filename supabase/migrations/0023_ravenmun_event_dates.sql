-- The conference now runs on 20-21-22 November 2026.
-- Keep both settings tables aligned so the public landing page, countdown and
-- admin settings form all use the same dates.

update public.system_settings
set event_start_date = '2026-11-20T00:00:00Z',
    event_end_date = '2026-11-22T23:59:59Z',
    updated_at = now();

update public.ravenmun_settings
set event_start_date = '2026-11-20T00:00:00Z',
    event_end_date = '2026-11-22T23:59:59Z',
    updated_at = now()
where id = true;
