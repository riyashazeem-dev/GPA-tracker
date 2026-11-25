-- 0003_elective_requirements.sql
-- Elective credit requirements supplied in the project specification.
-- (Department, Semester, Required Credits)
insert into public.elective_requirements (department_id, semester, required_credits)
select d.id, v.semester, v.required_credits
from (values
  ('IS', 5, 10),
  ('IS', 7, 9),
  ('IS', 8, 9),
  ('SE', 5, 10),
  ('SE', 6, 10),
  ('SE', 8, 8),
  ('DS', 5, 4),
  ('DS', 6, 2),
  ('DS', 7, 4),
  ('DS', 8, 2)
) as v(code, semester, required_credits)
join public.departments d on d.code = v.code
on conflict (department_id, semester) do update
  set required_credits = excluded.required_credits,
      updated_at = now();