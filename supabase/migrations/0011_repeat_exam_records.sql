-- 0011_repeat_exam_records.sql
-- Repeat examination attempts linked to an original result.
create table public.repeat_exam_records (
  id            uuid primary key default gen_random_uuid(),
  result_id     uuid not null references public.results(id) on delete cascade,
  attempt_number int not null check (attempt_number > 0),
  marks         numeric,
  letter_grade  text,
  grade_point   numeric,
  recorded_at   timestamptz not null default now()
);

comment on table public.repeat_exam_records is 'Repeat exam attempts per result.';