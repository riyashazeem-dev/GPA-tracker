-- 0001_departments.sql
-- Seed the three departments offered by the Faculty of Computing.
insert into public.departments (code, name) values
  ('IS', 'Information Systems'),
  ('SE', 'Software Engineering'),
  ('DS', 'Data Science')
on conflict (code) do nothing;