# Security Checklist

## Authentication
- [x] Google OAuth via Supabase (no passwords stored in app).
- [x] Session persistence + protected routes (`authGuard`, `onboardingGuard`).
- [x] Admin-only routes (`adminGuard`).

## Authorization / RLS
- [x] RLS enabled on all tables.
- [x] Students access only their own profile, results, elective selections,
      prediction settings.
- [x] Reference data (departments, semesters, curriculum, courses, grading,
      elective requirements, ai_config) is read-only for students; admin writes.
- [x] `is_admin()` security-definer helper guards admin writes.

## Secrets
- [x] OpenRouter key only in Edge Function secret (`OPENROUTER_API_KEY`).
- [x] Supabase `service_role` never in frontend.
- [x] Only the public anon/publishable key in `environment*.ts`.
- [x] `.env` git-ignored.

## Input validation
- [x] Marks 0–100 and letter-grade whitelist validated server-side (service).
- [x] Target FGPA constrained 0.00–4.00 in UI + engine.
- [x] Elective credit requirement validated before save.

## AI endpoint
- [x] Edge Function authenticates JWT (`auth.getUser`).
- [x] Sends only the caller's verified context.
- [x] AI cannot modify results/curriculum; explains engine numbers only.
- [ ] Rate limiting: add Supabase/Edge Function rate limits before public launch.

## Client hardening
- [x] Security headers (CSP-friendly, nosniff, frame-deny) in Vercel/Netlify config.
- [x] No secrets in bundle.

## Pending (manual)
- [ ] Live two-account isolation test (needs Supabase + Google creds).
- [ ] Enable Edge Function rate limiting / abuse protection.
- [ ] Rotate any keys if ever exposed.