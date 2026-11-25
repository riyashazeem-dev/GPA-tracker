-- 0010_student_elective_selections.sql
-- Electives a student actually registered for. Unselected electives never count toward GPA.
create table public.student_elective_selections (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  academic_year int  not null,
  created_at    timestamptz not null default now(),
  unique (student_id, course_id, academic_year)
);

comment on table public.student_elective_selections is 'Registered electives only. Drives GPA inclusion of elective courses.';