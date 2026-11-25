-- 0009_results.sql
-- Real student results only. No sample/seed results.
create table public.results (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  course_id         uuid not null references public.courses(id) on delete restrict,
  semester          int  not null check (semester between 1 and 8),
  academic_year     int  not null,
  marks             numeric,
  letter_grade      text,
  grade_point       numeric,
  counts_toward_gpa boolean not null default false,  -- resolved from course + rules at entry
  is_repeat         boolean not null default false,
  created_at        timestamptz not null default now()
);

comment on table public.results is 'Student course results. No fake data. counts_toward_gpa resolved per GPA rules.';
comment on column public.results.counts_toward_gpa is 'Resolved GPA eligibility for this result (course gpa_eligible AND credits present AND registered elective).';