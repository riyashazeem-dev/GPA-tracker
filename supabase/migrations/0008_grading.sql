-- 0008_grading.sql
-- Grading scales and grade points (values PENDING official regulations).
create table public.grading_scales (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.grade_points (
  id                uuid primary key default gen_random_uuid(),
  scale_id          uuid not null references public.grading_scales(id) on delete cascade,
  label             text not null,                 -- letter grade
  grade_point       numeric not null,
  min_percentage    numeric,
  counts_toward_gpa boolean not null default true,
  unique (scale_id, label)
);

comment on table public.grade_points is 'Grade points per scale. Populate from GPA_RULES.md (pending spec).';