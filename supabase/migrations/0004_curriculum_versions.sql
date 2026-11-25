-- 0004_curriculum_versions.sql
-- Versioned curriculum per department so historic and current programmes coexist.
create table public.curriculum_versions (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  version       text not null,                    -- e.g. '2024.1'
  effective_from date,
  is_active     boolean not null default true,
  total_credits numeric,                          -- official total (nullable until validated)
  created_at    timestamptz not null default now(),
  unique (department_id, version)
);

comment on table public.curriculum_versions is 'Curriculum versions per department.';