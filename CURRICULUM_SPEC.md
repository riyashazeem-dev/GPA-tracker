# Curriculum specification

The application uses the supplied Faculty of Computing curricula for three four-year programmes. Each programme has eight semesters. The module counts include optional electives.

| Programme | Modules in catalogue | Programme credits |
| --- | ---: | ---: |
| [Information Systems (IS)](curriculum-import/is-curriculum.json) | 85 | 138 |
| [Software Engineering (SE)](curriculum-import/se-curriculum.json) | 75 | 157 |
| [Data Science (DS)](curriculum-import/ds-curriculum.json) | 80 | 120 |

Programme credit totals use the required elective credits, while the catalogue includes every elective option. GPA includes eligible elective modules the student registers for. Modules without a numerical credit value are stored with `null` credits.

[Migration 0021](supabase/migrations/0021_official_curriculum_data.sql) imports the curriculum and grading reference data into Supabase. The [curriculum validation report](curriculum-import/curriculum-validation-report.md) lists semester totals, elective requirements and source details that need faculty confirmation. See the [GPA rules](GPA_RULES.md) for how grades contribute to a degree classification.
