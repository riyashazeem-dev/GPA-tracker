# Development Roadmap

> Phases 1 and 3 are complete; Phase 2 is partially complete (data import
> blocked on the official curriculum). Later phases start only on explicit request.

## Phase 1 — Project Setup & Architecture ✅
- Angular 22 app scaffolded (standalone, signals, Vitest).
- Routing with lazy feature components + `authGuard` / `guestGuard` / `adminGuard`.
- Supabase client + environment config (public key only).
- Tailwind CSS v4 + Chart.js installed.
- Scalable folder structure (`core` / `shared` / `features` / `services` / `models`).
- Domain interfaces and service stubs (auth, curriculum, gpa, results, predictions).
- Documentation set created (data sections pending official spec).
- Verified: `npm run build` succeeds.

## Phase 2 — Data & Database (in progress)
- [x] Full PostgreSQL schema: departments, semesters, curriculum_versions,
      courses, elective_requirements, profiles, grading_scales/grade_points,
      results, student_elective_selections, repeat_exam_records.
- [x] Constraints, indexes, GPA-eligibility view, RLS policies.
- [x] Seed: departments (IS/SE/DS) + elective requirements (provided data).
- [x] Validation script + report generator (`npm run validate:curriculum`).
- [ ] Import IS/SE/DS modules — **blocked: official curriculum not supplied**.
- [ ] Grading scale + grade points — **blocked: official regulations not supplied**.
- [ ] Run validation against official totals and resolve mismatches.

## Phase 3 — Official GPA Calculation Engine ✅
- [x] Authoritative engine `services/gpa/gpa-engine.ts` (semester, year, FGPA,
      classification, repeat, rounding) + official grade scale.
- [x] `GpaService` delegates to the engine (no duplicate formulas).
- [x] 31 Vitest cases pass (`npm test`); report in `docs/GPA_TEST_REPORT.md`.

## Phase 4 — Auth & Profiles ✅ (code); manual RLS test pending live Supabase
- [x] Google OAuth sign-in/out, session persistence, protected routes.
- [x] First-login onboarding (department/version/semester) saved to profile.
- [x] Results CRUD (marks or grade, auto grade point), actual vs predicted split.
- [x] Elective registration with credit validation; only selected count toward GPA.
- [x] Repeat attempts via Phase 3 engine.
- [x] RLS for results/electives/profile/prediction settings (admin-only reference writes).
- [ ] Live two-account isolation test (see `docs/AUTH_AND_TESTING.md`).

## Phase 5 — Complete Frontend & Student Dashboard ✅
- [x] Design system: light/dark mode, responsive shell, 10-item nav, profile header.
- [x] Dashboard: profile, semester/year GPA, provisional FGPA, predicted class, remaining modules.
- [x] Semester 1–8 views with modules table, marks/grade entry, completion stats.
- [x] Year GPA, FGPA Predictor, Target Planner (all via the engine).
- [x] Academic Progress charts (Chart.js): semester line, year bar, credit doughnut, grade distribution.
- [x] Loading/empty/error states; Chart.js wrapper; no duplicate GPA logic.
- [ ] Full 8×3 department test needs seeded curriculum (data pending).

## Phase 6 — GPA Prediction & Target Planner ✅
- [x] Pure prediction engine: linear FGPA model, required average, feasibility,
      max achievable, grade-combination suggestions (no AI).
- [x] Conservative/realistic/optimistic scenarios with editable assumptions.
- [x] Expected-results entry (kept separate from actuals) + expected semester GPA.
- [x] Advanced target planner UI: current/target, required performance, progress,
      year plan, combination table, scenario chart.
- [x] 10 prediction tests (41 total pass), incl. no-completed-year boundary.

## Phase 7 — Results & GPA (polish)
- Import/export, bulk entry, validation refinements.

## Phase 8 — AI Assistant ✅ (code); live test needs Supabase + OpenRouter key
- [x] Secure Edge Function proxying OpenRouter (key as server secret).
- [x] Admin-configurable primary + fallback model (`ai_config`).
- [x] Verified context from engine; AI explains, never recalculates.
- [x] Chat UI: history, suggestions, loading, error handling.
- [ ] Live test with free models + failure simulation (see `docs/AI_ASSISTANT.md`).

## Phase 9 — Admin & Hardening ✅ (code); manual config pending
- [x] Admin AI model config; security headers; input validation.
- [x] Deployment config (Vercel/Netlify) + guides; security checklist.
- [x] 41 tests pass; production build clean.
- [ ] Manual: Google OAuth, Supabase, OpenRouter, curriculum seed data.