-- 0016_results_is_predicted.sql
-- Keep actual results separate from predicted results.
alter table public.results
  add column if not exists is_predicted boolean not null default false;

comment on column public.results.is_predicted is 'true = projection/expected result; false = actual result.';

-- Prevent mixing: a student cannot mark an actual result as predicted twice via unique? Not required.
create index if not exists idx_results_is_predicted on public.results (student_id, is_predicted);