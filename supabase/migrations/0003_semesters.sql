-- 0003_semesters.sql
-- Eight semesters per department.
create table public.semesters (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  number        int  not null check (number between 1 and 8),
  unique (department_id, number)
);

comment on table public.semesters is 'Eight semesters (1..8) for each department.';