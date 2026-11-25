-- 0005_courses.sql
-- Courses belonging to a curriculum version.
-- IMPORTANT:
--   * `code` preserves official codes verbatim, including hyphens (text, no transform).
--   * `credits` is NULL when the official value is missing (never 0).
--   * `gpa_eligible` marks Non-GPA modules (false) vs numerical-credit modules (true).
--   * `is_elective` marks elective slots; being elective does NOT exclude GPA by itself.
create table public.courses (
  id                   uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid not null references public.curriculum_versions(id) on delete cascade,
  department_id        uuid not null references public.departments(id) on delete cascade,
  code                 text not null,           -- official code, hyphens preserved
  name                 text not null,
  semester             int  not null check (semester between 1 and 8),
  credits              numeric check (credits is null or credits > 0),
  category             text not null check (category in ('core','elective','general','practical','project')),
  gpa_eligible         boolean not null default true,
  is_elective          boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (curriculum_version_id, code)
);

comment on table public.courses is 'Curriculum courses. credits NULL = missing; gpa_eligible=false = Non-GPA.';
comment on column public.courses.credits is 'NULL when official credit value is missing. Never store 0 for missing.';