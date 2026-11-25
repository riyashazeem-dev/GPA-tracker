# Curriculum validation report

Source: curriculum text supplied by the user in this ChatGPT conversation. This package transcribes that content; it is not independently verified against a faculty handbook.

## Semester totals

| Department | Semester | Core/compulsory GPA credits | Available elective pool | Required elective credits | Expected registered total | Official total | Difference | Courses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| IS | 1 | 16 | 0 | — | 16 | 16 | +0 | 12 |
| IS | 2 | 16 | 0 | — | 16 | 16 | +0 | 13 |
| IS | 3 | 16 | 0 | — | 16 | 16 | +0 | 10 |
| IS | 4 | 17 | 0 | — | 17 | 17 | +0 | 11 |
| IS | 5 | 12 | 10 | 10 | 22 | 22 | +0 | 15 |
| IS | 6 | 6 | 0 | — | 6 | 6 | +0 | 1 |
| IS | 7 | 10 | 9 | 9 | 19 | 19 | +0 | 12 |
| IS | 8 | 17 | 9 | 9 | 26 | 26 | +0 | 11 |
| SE | 1 | 18 | 0 | — | 18 | 18 | +0 | 10 |
| SE | 2 | 19 | 0 | — | 19 | 19 | +0 | 10 |
| SE | 3 | 16 | 0 | — | 16 | 16 | +0 | 8 |
| SE | 4 | 22 | 0 | — | 22 | 22 | +0 | 11 |
| SE | 5 | 12 | 10 | 10 | 22 | 22 | +0 | 11 |
| SE | 6 | 16 | 10 | 10 | 26 | 26 | +0 | 13 |
| SE | 7 | 6 | 0 | — | 6 | 6 | +0 | 1 |
| SE | 8 | 20 | 8 | 8 | 28 | 28 | +0 | 11 |
| DS | 1 | 14 | 0 | — | 14 | 14 | +0 | 11 |
| DS | 2 | 15 | 0 | — | 15 | 15 | +0 | 10 |
| DS | 3 | 13 | 0 | — | 13 | 13 | +0 | 8 |
| DS | 4 | 19 | 0 | — | 19 | 19 | +0 | 11 |
| DS | 5 | 12 | 10 | 4 | 16 | 16 | +0 | 12 |
| DS | 6 | 11 | 10 | 2 | 13 | 13 | +0 | 9 |
| DS | 7 | 9 | 10 | 4 | 13 | 13 | +0 | 10 |
| DS | 8 | 15 | 8 | 2 | 17 | 17 | +0 | 9 |

## Notes and flags

- For semesters with electives, the expected registered total is calculated as core/compulsory GPA credits plus the required elective credits, not the sum of every elective option in the catalogue.
- Elective totals are reference totals. Individual students must only include electives they actually select.
- IS elective options listed at Semesters 5, 7 and 8 sum exactly to stated elective requirements.
- SE elective options listed at Semesters 5, 6 and 8 sum exactly to stated elective requirements.
- DS elective options exceed the required selected credits in Semesters 5–8; selection validation is required.
- IS modules with a dash for credits are stored with `credits: null` and excluded from GPA until eligibility/credit is confirmed.
- DS modules marked Compulsory (Non-GPA) are stored with `credits: null` and `gpa_eligible: false`.
- SE modules with numerical credits, including Communication Skills and English modules, are preserved as GPA eligible because the supplied curriculum assigns numerical credits and does not mark them Non-GPA.
- DS Academic English I is supplied as course code `DS-EAP-1201` under Semester III; the code prefix appears inconsistent with the semester-digit convention. Preserved exactly as supplied and flagged for faculty verification.
- IS official curriculum note says the IS and Computing and Information Systems degree programmes have the same subject content; this seed is for the IS programme only.
- Some source spellings/capitalization (e.g. `Programing`, `Data structures`) are preserved as supplied.

### Credit-total check

All semester totals match when elective requirements (rather than the full elective option pool) are applied.