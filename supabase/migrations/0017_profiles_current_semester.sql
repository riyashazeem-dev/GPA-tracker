-- 0017_profiles_current_semester.sql
-- Store the student's current semester (set during onboarding).
alter table public.profiles
  add column if not exists current_semester int check (current_semester between 1 and 8);

comment on column public.profiles.current_semester is 'Student current semester (1..8), set at onboarding.';