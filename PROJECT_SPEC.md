# Smart GPA Tracker — Project Specification

> Status: Phase 1 (Project Setup & Architecture) complete.
> Data sections marked **PENDING SPEC** must be filled from the official
> university curriculum and examination regulations supplied in the project
> specification. No course modules or GPA formulas are invented in this repo.

## 1. Purpose
A web application for students of the Faculty of Computing to track academic
performance: record real results, compute semester and cumulative GPA per the
official regulations, visualise trends, and plan toward a target GPA.

## 2. Technology Stack
| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | Angular 22 (standalone components, signals)        |
| Language           | TypeScript 6                                       |
| Database           | Supabase PostgreSQL                                |
| Auth               | Supabase Auth (email/password)                     |
| Styling            | Tailwind CSS v4 (`@tailwindcss/postcss`)           |
| Charts             | Chart.js 4                                         |
| AI (future)        | OpenRouter, proxied via Supabase Edge Function     |
| Tests              | Vitest (`@angular/build:unit-test`)                |

## 3. Functional Scope
- **Auth** — register / login / logout; role-based access (student, admin).
- **Dashboard** — GPA summary, credits, recent results, charts.
- **Curriculum** — programme structure and course catalogue (from spec).
- **Semesters** — per-semester results and GPA trend.
- **Results & GPA** — enter/import real results; compute GPA per rules.
- **Predictions** — projected GPA under scenarios (estimates only).
- **Target Planner** — grades required to reach a target GPA.
- **AI Assistant** — future OpenRouter guidance (server-proxied).
- **Admin** — manage curriculum, grading scales, users.

## 4. Non-Functional Requirements
- **Security**: only the Supabase public (anon/publishable) key in the browser.
  `service_role` and OpenRouter keys live only in Edge Function secrets.
- **Accuracy**: GPA logic must match the official regulations exactly.
- **No fake data**: no sample student results or invented modules ship in code.
- **Scalability**: modular `core` / `shared` / `features` / `services` / `models`.

## 5. Source of Truth
- Curriculum: `CURRICULUM_SPEC.md` (**PENDING SPEC**).
- Grading & GPA: `GPA_RULES.md` (**PENDING SPEC**).
- Database: `DATABASE_SCHEMA.md`.
- Delivery plan: `DEVELOPMENT_ROADMAP.md`.

## 6. Out of Scope (Phase 1)
- No feature UI beyond placeholders.
- No curriculum/grading data population.
- No AI integration.