# Deploy Smart GPA Tracker

## Push the source to GitHub

Check that only source, documentation, migrations and public assets are staged. Git ignores dependency directories, local build output, Supabase link metadata and local environment files. The frontend configuration contains a Supabase publishable key intended for browser use. Keep service-role keys, Google client secrets and OpenRouter keys in their service settings.

Push the local `main` branch to the GitHub repository. Git Credential Manager can open a browser when GitHub sign-in is required.

```sh
git push -u origin main
```

## Import the GitHub repository into Netlify

In Netlify, choose **Add new project → Import an existing project → GitHub** and select the repository and its `main` branch. Netlify reads the build settings from `netlify.toml`.

| Setting | Value |
| --- | --- |
| Node.js | 24.15.0 |
| Build command | `npm run build` |
| Publish directory | `dist/smart-gpa-tracker/browser` |

The SPA redirect lets direct URLs such as `/auth/callback` and `/dashboard` load in Angular. Vercel also has a checked-in configuration for the same build output.

## Configure Google sign-in for the hosted URL

1. In **Supabase → Authentication → URL Configuration**, set **Site URL** to the hosted site's HTTPS origin. Add the hosted `/auth/callback` to **Redirect URLs**. Keep `http://localhost:4200/auth/callback` if local sign-in is still needed.
2. In **Google Auth Platform → Clients**, add the hosted origin under **Authorized JavaScript origins** for the existing web client. Its **Authorized redirect URI** is the Supabase provider callback `https://<project-ref>.supabase.co/auth/v1/callback`.
3. In **Google Auth Platform → Audience**, add intended testers while the External app is in Testing. For a public launch, put the app in production after completing the setup Google requires.
4. On the hosted site, sign in, sign out, and choose another account. A new student sees programme selection. A returning student sees their previously saved programme and grades.

## Database and release checks

Use the existing hosted Supabase project. For a new deployment target, use the migration history and review a dry run before applying pending migrations.

```sh
npx supabase db push --dry-run --remote
npx supabase db push --remote
```

The production reference data is in migration 0021. Migration 0023 provides atomic semester grade saving and one active record per account, course and result type. The local seed files are for development.

```sh
npm ci
npm run typecheck
npm test -- --watch=false
npm run build
```
