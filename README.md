# Smart GPA Tracker

Track university grades and GPA for Information Systems (IS), Software Engineering (SE) and Data Science (DS).

**[Open the live GPA Tracker](https://gpa-tracker-0obs.netlify.app)** · [Report an issue](https://github.com/riyashazeem-dev/GPA-tracker/issues)

## Features

- Google sign-in with a separate programme and grade history for each account.
- Eight semesters of predefined university modules, with grades saved through the dashboard.
- Credit-weighted semester GPA and CGPA, plus degree classification. The dashboard marks the class as provisional until the required results are complete.
- Target GPA planner that suggests grades using module credits.

The Angular frontend is hosted on Netlify. Supabase handles Google authentication, PostgreSQL storage and account-level access.

## Run locally

Use Node.js 24.15.0 or later in the Node 24 series and npm.

```sh
npm ci
npm start
```

Open [localhost:4200](http://localhost:4200). If you are setting up your own backend, follow the [Supabase setup guide](docs/SUPABASE_SETUP.md) to configure it before signing in.

## Verify changes

```sh
npm run typecheck
npm test -- --watch=false
npm run build
```

The production build goes to `dist/smart-gpa-tracker/browser`.

## Documentation

| Guide | Covers |
| --- | --- |
| [Deployment](docs/DEPLOYMENT.md) | GitHub, Netlify and hosted Google callback settings |
| [Supabase setup](docs/SUPABASE_SETUP.md) | Database migrations and Google provider setup |
| [Auth and account testing](docs/AUTH_AND_TESTING.md) | First login, grade saving, returning users and account isolation |
| [GPA rules](GPA_RULES.md) | Grade points, elective and repeat rules, and degree classification |
| [Curriculum](CURRICULUM_SPEC.md) | Programme modules and credit requirements |

Application code is in `src/app/`. Database migrations and SQL tests are in `supabase/`.

Built by [riyashazeem-dev](https://github.com/riyashazeem-dev).
