# Smart GPA Tracker – Curriculum Import Package

This package contains the IS, SE and DS curriculum transcribed from the original curriculum details supplied by the user in the ChatGPT conversation.

## Files
- `is-curriculum.json` – Information Systems, semesters 1–8.
- `se-curriculum.json` – Software Engineering, semesters 1–8.
- `ds-curriculum.json` – Data Science, semesters 1–8.
- `official-academic-rules.json` – grade points, year weights, classifications and elective credit requirements.
- `curriculum-validation-report.md` – credit checks and items requiring review.

## Important import instructions
1. Copy these files into the corresponding locations in the Angular/Supabase project.
2. Ask the coding agent to inspect the existing Supabase migrations before generating `seed.sql`.
3. Map these JSON fields to the actual database schema rather than assuming table/column names.
4. Preserve all official codes and module names exactly as written.
5. Do not automatically include every elective in a student's results; only selected electives count.
6. Do not assign GPA credit to null-credit modules.
7. Review `curriculum-validation-report.md` with the faculty before treating any flagged item as official.

## Data model
Each course has `course_code`, `course_name`, `credits`, `category`, and `gpa_eligible`. A null `credits` value means no numerical credit was provided in the source.
