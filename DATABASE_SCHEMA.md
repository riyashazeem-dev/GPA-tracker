# Database Schema (Supabase PostgreSQL)

> Status: **Implemented** as migrations in `supabase/migrations/`.
> Curriculum/grading *data* is pending the official spec (seed templates only).

## Entity-Relationship Overview
```
departments 1───* semesters
departments 1───* curriculum_versions 1───* courses
departments 1───* elective_requirements
departments 1───* profiles
curriculum_versions 1───* profiles
courses 1───* results 1───* repeat_exam_records
courses 1───* student_elective_selections
profiles 1───* results
profiles 1───* student_elective_selections
grading_scales 1───* grade_points
auth.users 1───1 profiles
```

## Tables

### departments
`id uuid PK`, `code text UNIQUE` (IS/SE/DS), `name`, `faculty`, `created_at`.

### semesters
`id uuid PK`, `department_id FK→departments`, `number int 1..8`, `UNIQUE(department_id, number)`.

### curriculum_versions
`id uuid PK`, `department_id FK→departments`, `version`, `effective_from`,
`is_active`, `total_credits`, `UNIQUE(department_id, version)`.

### courses
`id uuid PK`, `curriculum_version_id FK→curriculum_versions`, `department_id FK→departments`,
`code` (official, hyphens preserved), `name`, `semester 1..8`,
`credits numeric NULL` (missing = NULL, never 0),
`category` (core/elective/general/practical/project),
`gpa_eligible bool` (false = Non-GPA), `is_elective bool`,
`UNIQUE(curriculum_version_id, code)`.

### elective_requirements
`id uuid PK`, `department_id FK→departments`, `semester 1..8`,
`required_credits numeric > 0`, timestamps, `UNIQUE(department_id, semester)`.
Admin-editable.

### profiles
`id uuid PK → auth.users`, `email`, `role` (student/admin), `department_id FK`,
`curriculum_version_id FK`, `intake_year`, `faculty`, `created_at`.
Auto-created by `handle_new_user` trigger.

### grading_scales / grade_points
`grading_scales(id, name, is_active)`.
`grade_points(id, scale_id FK, label, grade_point, min_percentage, counts_toward_gpa, UNIQUE(scale_id,label))`.

### results
`id uuid PK`, `student_id FK→profiles`, `course_id FK→courses`,
`semester`, `academic_year`, `marks`, `letter_grade`, `grade_point`,
`counts_toward_gpa bool`, `is_repeat bool`. No seed/fake results.

### student_elective_selections
`id uuid PK`, `student_id FK→profiles`, `course_id FK→courses`, `academic_year`,
`UNIQUE(student_id, course_id, academic_year)`. Only registered electives.

### repeat_exam_records
`id uuid PK`, `result_id FK→results`, `attempt_number`, `marks`, `letter_grade`,
`grade_point`, `recorded_at`.

## GPA Eligibility (view `v_gpa_eligible_results`)
A result counts toward GPA when **all** hold:
1. `courses.gpa_eligible = true` (Non-GPA excluded).
2. `courses.credits IS NOT NULL` (missing numerical credit excluded).
3. If `courses.is_elective`, a matching `student_elective_selections` row exists
   (unselected electives excluded).

Categories are preserved; numerical-credit electives (e.g. Communication Skills,
English) are **not** auto-excluded.

## Indexes
See `0012_indexes.sql` (courses by dept/semester/version, results by student/course/year,
elective selections, repeats, elective requirements).

## Row Level Security
See `0014_rls.sql`. Reference data: authenticated read, admin write. Students:
own results, own elective selections, own profile. `is_admin()` helper guards writes.

## Phase 4 additions
- `profiles.current_semester int 1..8` (migration `0017`) — set at onboarding.
- `results.is_predicted boolean default false` (migration `0016`) — keeps actual
  and predicted results separate; indexed by `(student_id, is_predicted)`.
- `prediction_settings` (migration `0015`): `student_id`, `target_gpa`,
  `expected_year_gpas jsonb`, `updated_at`; RLS owner/admin only. Private and
  never mixed with actual results.