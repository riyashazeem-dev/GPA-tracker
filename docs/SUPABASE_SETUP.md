# Supabase Setup

## 1. Create project
1. Create a project at https://supabase.com.
2. Copy the **Project URL** and **anon / publishable key** (Settings → API).

## 2. Configure the frontend
Set these in `src/environments/environment.ts` (and `environment.prod.ts`):

```ts
supabase: { url: 'https://<ref>.supabase.co', anonKey: '<anon-publishable-key>' }
```

> Never use the `service_role` key in the browser.

## 3. Apply migrations & seeds
Run the SQL in order (Supabase SQL Editor, or CLI `supabase db push`):

```
supabase/migrations/0001_extensions.sql
supabase/migrations/0002_departments.sql
supabase/migrations/0003_semesters.sql
supabase/migrations/0004_curriculum_versions.sql
supabase/migrations/0005_courses.sql
supabase/migrations/0006_elective_requirements.sql
supabase/migrations/0007_profiles.sql
supabase/migrations/0008_grading.sql
supabase/migrations/0009_results.sql
supabase/migrations/0010_student_elective_selections.sql
supabase/migrations/0011_repeat_exam_records.sql
supabase/migrations/0012_indexes.sql
supabase/migrations/0013_views.sql
supabase/migrations/0014_rls.sql
supabase/migrations/0015_prediction_settings.sql
supabase/migrations/0016_results_is_predicted.sql
supabase/migrations/0017_profiles_current_semester.sql
supabase/migrations/0018_ai_config.sql

supabase/seed/0001_departments.sql
supabase/seed/0002_curriculum_versions.sql   -- PENDING SPEC
supabase/seed/0003_elective_requirements.sql
supabase/seed/0004_courses.sql                -- PENDING SPEC
supabase/seed/0005_grading.sql                -- PENDING SPEC
```

## Google Authentication
1. In Google Cloud Console, create an OAuth 2.0 client (Web application).
2. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
3. In Supabase → Authentication → Providers → Google, enable and paste the
   Client ID and Secret.
4. In Authentication → URL Configuration, set Site URL to your app origin and
   add `<origin>/auth/callback` to allowed redirect URLs.

## 4. Validate
```bash
# set env first
npm run validate:curriculum
```
Writes `docs/VALIDATION_REPORT.md`.

## AI Assistant (Edge Function)
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-xxxx
supabase functions deploy ai-assistant
```
See `docs/AI_ASSISTANT.md`.

## Notes
- `0002_curriculum_versions.sql`, `0004_courses.sql`, `0005_grading.sql` are
  templates awaiting the official curriculum and regulations. They contain no
  invented data.
- The `handle_new_user` trigger auto-creates a `profiles` row on signup.
- RLS: reference data is read-only for authenticated users; only admins write.
  Students access only their own results and elective selections.