# Smart GPA Tracker

University GPA tracker for Information Systems, Software Engineering and Data Science. Students sign in with Google, select a programme on their first visit, and track their module grades and cumulative GPA.

## Run locally

Use Node.js 24.15.0 or later in the Node 24 series and npm. The Angular frontend uses the public project URL and publishable key in `src/environments/environment*.ts`.

```sh
npm ci
npm start
```

Open [the local app](http://localhost:4200). Choose a Google account with access to the configured OAuth app.

## Verify changes

```sh
npm run typecheck
npm test -- --watch=false
npm run build
```

The production build is in `dist/smart-gpa-tracker/browser`.

## Project layout

- `src/app/features/` contains sign-in, programme selection, the dashboard and the target GPA planner.
- `src/app/services/gpa/` contains the shared grading and credit-weighted GPA rules.
- `supabase/migrations/` contains the database schema, curriculum, grading scale and policies.
- `supabase/tests/` contains database workflow and isolation checks.

The hosted project uses the supplied curriculum for all three programmes. Migrations 0021 and 0023 install the reference data and programme grade workflow respectively.

See the [deployment guide](docs/DEPLOYMENT.md) for GitHub, Netlify and Google OAuth configuration, and [GPA rules](GPA_RULES.md) for the grading policy.
