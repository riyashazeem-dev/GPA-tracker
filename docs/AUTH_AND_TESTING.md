# Auth and account isolation tests

## Browser smoke test

Use the [live site](https://gpa-tracker-0obs.netlify.app) or a deployment configured using the [Supabase setup guide](SUPABASE_SETUP.md). Use two Google accounts with their owner's permission.

| Step | Expected result |
| --- | --- |
| Sign in for the first time | Programme selection offers Information Systems, Software Engineering and Data Science |
| Select a programme | The dashboard lists modules for that programme |
| Enter grades and choose **Calculate & Save GPA** | Grades persist, and semester GPA, CGPA and degree class update |
| Sign out, then choose the same account | The dashboard restores the saved programme and grades |
| Sign out, then choose the other Google account | A new account sees programme selection and uses its own grade records |

## Automated checks

```sh
npm run typecheck
npm test -- --watch=false
```

The [SQL workflow test](../supabase/tests/programme_grade_workflow.sql) exercises programme selection, atomic grade saving, duplicate prevention and account isolation using synthetic accounts. It rolls back the database writes. Run it against a configured test project with the required migrations applied.
