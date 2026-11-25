# Auth & Account Isolation Testing

> Automated GPA tests run with `npm test`. Auth/RLS isolation requires a live
> Supabase project and two Google test accounts (manual, documented below).

## Setup
1. Configure Google provider (see `SUPABASE_SETUP.md`).
2. Apply all migrations and seeds.
3. Use two separate Google accounts: **Student A** and **Student B**.

## Test cases
| # | Scenario | Expected |
| - | -------- | -------- |
| 1 | Student A signs in with Google | Redirected to `/onboarding` on first login |
| 2 | A selects department/version/semester | Saved to `profiles`; reaches dashboard |
| 3 | A reloads | Session persists; no re-onboarding |
| 4 | A enters marks for a module | Grade + grade point auto-filled; saved |
| 5 | A enters a letter grade only | Grade point resolved; saved |
| 6 | A edits/deletes a result | Change persists after re-login |
| 7 | A saves a predicted result | Stored with `is_predicted = true`, separate list |
| 8 | A selects electives below required credits | Save blocked with message |
| 9 | A selects enough elective credits | Saved; only these count toward GPA |
| 10 | A adds a repeat attempt (E/D) | Effective GP resolved via Phase 3 rules |
| 11 | B signs in | B sees only B's data (RLS) |
| 12 | A queries B's results (devtools) | No rows returned (RLS) |
| 13 | Student updates `courses`/`grading` | Denied by RLS (admin only) |
| 14 | Admin updates curriculum | Allowed |

## Notes
- RLS is enforced in the database; the client cannot bypass it.
- `is_admin()` drives admin-only writes on reference data.
- Actual vs predicted results are separated by `results.is_predicted`.