-- 0006_elective_requirements.sql
-- Student-selectable elective credit requirements per department & semester.
-- Administrators may change these values.
create table public.elective_requirements (
  id              uuid primary key default gen_random_uuid(),
  department_id   uuid not null references public.departments(id) on delete cascade,
  semester        int  not null check (semester between 1 and 8),
  required_credits numeric not null check (required_credits > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (department_id, semester)
);

comment on table public.elective_requirements is 'Elective credit requirements; admin-editable.';