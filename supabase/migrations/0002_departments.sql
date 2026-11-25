-- 0002_departments.sql
-- Departments offered by the Faculty of Computing.
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,           -- e.g. 'IS', 'SE', 'DS'
  name        text not null,
  faculty     text not null default 'Faculty of Computing',
  created_at  timestamptz not null default now()
);

comment on table public.departments is 'Academic departments (IS, SE, DS).';