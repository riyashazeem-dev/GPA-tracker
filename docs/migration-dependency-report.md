# Migration Dependency Report

Generated during Phase 9 (live Supabase integration) after remote `db push`
failed with `relation "public.profiles" does not exist` (SQLSTATE 42P01).

## Root cause
`0001_extensions.sql` defined `public.is_admin()` with a **SQL-language** body
that selects from `public.profiles`. PostgreSQL validates SQL function bodies at
`CREATE FUNCTION` time, but `public.profiles` is not created until
`0007_profiles.sql`. So `0001` aborted, and because it was the first migration,
**no** later migration ran — hence the follow-on `public.courses does not exist`.

## Migration dependency map (corrected order)

| Order | File | Creates | Depends on |
|------:|------|---------|-----------|
| 1 | 0001_extensions | `pgcrypto` extension | — |
| 2 | 0002_departments | `departments` | — |
| 3 | 0003_semesters | `semesters` | departments |
| 4 | 0004_curriculum_versions | `curriculum_versions` | departments |
| 5 | 0005_courses | `courses` | curriculum_versions, departments |
| 6 | 0006_elective_requirements | `elective_requirements` | departments |
| 7 | 0007_profiles | `profiles`, `handle_new_user()`, **`is_admin()`** | auth.users, departments, curriculum_versions |
| 8 | 0008_grading | `grading_scales`, `grade_points` | — |
| 9 | 0009_results | `results` | profiles, courses |
| 10 | 0010_student_elective_selections | `student_elective_selections` | profiles, courses |
| 11 | 0011_repeat_exam_records | `repeat_exam_records` | results |
| 12 | 0012_indexes | indexes | all above tables |
| 13 | 0013_views | `v_gpa_eligible_results` | results, courses, selections |
| 14 | 0014_rls | RLS enable + policies (uses `is_admin()`) | all tables + `is_admin()` |
| 15 | 0015_prediction_settings | `prediction_settings` + RLS | profiles, `is_admin()` |
| 16 | 0016_results_is_predicted | `results.is_predicted` | results |
| 17 | 0017_profiles_current_semester | `profiles.current_semester` | profiles |
| 18 | 0018_ai_config | `ai_config` + RLS | `is_admin()` |
| 19 | 0019_ai_usage | `ai_usage` + RLS | auth.users, `is_admin()` |
| 20 | 0020_curriculum_categories | relax `courses.category` CHECK | courses |
| — | seed.sql | departments, semesters, versions, 240 courses, elective reqs, grading | 0001–0020 |

## Findings
1. `public.profiles` created by **0007_profiles.sql**.
2. `public.courses` created by **0005_courses.sql**.
3. `public.is_admin()` was defined in **0001_extensions.sql** (wrong) → moved to **0007_profiles.sql**.
4. RLS policies using `is_admin()`: **0014_rls.sql** (all), plus **0015**, **0018**, **0019**.
5. No other function forward-references a missing table:
   - `handle_new_user()` (0007) references `profiles` created earlier in the same file.
   - `v_gpa_eligible_results` (0013) references tables from 0005/0009/0010.

## Fix applied
- `0001_extensions.sql`: now only `create extension if not exists pgcrypto;`.
- `0007_profiles.sql`: `is_admin()` appended after `profiles` exists.
  - `SECURITY DEFINER`, `set search_path = public`, fully-qualified `auth.uid()`.
  - No RLS recursion: definer runs as owner and bypasses RLS on `profiles`.
- No columns invented; `profiles` schema, `role` check, and admin logic unchanged.

## Migration history safety
`npx supabase migration list --remote` against project `uxdjjrkssorwklsxwppo`
(production) shows **Remote column empty for 0001–0020** → nothing applied.
Therefore editing the initial files is safe; no `migration repair` is used and
no failed migration is marked applied.