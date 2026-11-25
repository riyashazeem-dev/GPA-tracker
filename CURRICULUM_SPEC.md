# Curriculum Specification

> Status: **PENDING SPEC**. The complete IS / SE / DS programme structure and
> course catalogue must be transcribed from the official university curriculum in
> the project specification. No course modules are invented in this repository.
>
> Database structure to hold this data is implemented in
> `supabase/migrations/` and `supabase/seed/` (course seed is a pending template).

## Programme
| Field        | Value                    |
| ------------ | ------------------------ |
| Faculty      | Faculty of Computing     |
| Department   | TBD                      |
| Programme    | TBD                      |
| Duration     | TBD years / 8 semesters  |
| Total credits| TBD                      |

## Course Catalogue
_To be transcribed. One row per course; do not fabricate entries._

| Code | Title | Credits | Category | Semester | Year | Prereqs | Practical |
| ---- | ----- | ------- | -------- | -------- | ---- | ------- | --------- |
| TBD  | TBD   | TBD     | TBD      | TBD      | TBD  | TBD     | TBD       |

## Semester Structure
_To be transcribed from the curriculum._

| Semester | Year | Courses |
| -------- | ---- | ------- |
| 1        | TBD  | TBD     |
| ...      | ...  | ...     |

## Notes
- Curriculum data is seeded into `curricula` / `courses` tables in Phase 2.
- `CurriculumService` reads this data; it never generates courses.