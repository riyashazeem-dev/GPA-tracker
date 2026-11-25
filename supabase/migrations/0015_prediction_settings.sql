-- 0015_prediction_settings.sql
-- Per-student prediction settings (private). Separate from actual results.
create table public.prediction_settings (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  target_gpa      numeric,
  expected_year_gpas jsonb,          -- e.g. [3.5, 3.6, null, null] projected inputs
  updated_at      timestamptz not null default now(),
  unique (student_id)
);

comment on table public.prediction_settings is 'Private prediction settings per student. Never mixed with actual results.';

alter table public.prediction_settings enable row level security;

create policy prediction_settings_owner on public.prediction_settings
  for all to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());