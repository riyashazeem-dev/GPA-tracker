# Supabase setup

Use these steps to configure an existing Supabase project or provision a new backend for this application.

## Connect the frontend

Copy the project URL and **publishable key** from Supabase. Set them in `src/environments/environment.ts` and `src/environments/environment.prod.ts`.

```ts
supabase: { url: 'https://<project-ref>.supabase.co', anonKey: '<publishable-key>' }
```

The publishable key is intended for browser use. Keep the service-role key and Google OAuth client secret in their server-side settings.

## Apply database migrations

From the repository root, link the CLI to the intended project and review the pending migrations before applying them.

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run --remote
npx supabase db push --remote
```

The migrations include the official curriculum and grading data in `0021`, Data API permissions in `0022`, and the programme and grade-saving workflow in `0023`. Local seed files are for development. The signup trigger creates a profile for each new account, and row-level security restricts grade access to the owning account.

## Enable Google sign-in

1. In Google Auth Platform, create a **Web application** OAuth client.
2. Under **Authorized JavaScript origins**, add the app's origin. For local development use `http://localhost:4200`.
3. Under **Authorized redirect URIs**, add the callback shown by the Supabase Google provider. It is normally `https://<project-ref>.supabase.co/auth/v1/callback`.
4. In **Supabase → Authentication → Sign In / Providers → Google**, enable the provider and save the OAuth client ID and secret.
5. In **Supabase → Authentication → URL Configuration**, set the app's **Site URL** and allow its complete `/auth/callback` URL under **Redirect URLs**.

See the [deployment guide](DEPLOYMENT.md) for the hosted URL and [account tests](AUTH_AND_TESTING.md) for sign-in and save verification.
