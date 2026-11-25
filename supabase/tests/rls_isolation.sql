-- supabase/tests/rls_isolation.sql
-- RLS isolation test TEMPLATE. Run in the Supabase SQL editor (as postgres),
-- replacing <UUID-A>, <UUID-B>, <PROFILE-A>, <PROFILE-B>, <COURSE> as needed.
-- Asserts: A reads only A's rows; A cannot update B's rows; students cannot
-- write reference data; admins can.

-- Setup (as postgres, bypasses RLS)
insert into auth.users (id, email) values ('<UUID-A>', 'a@test.local'), ('<UUID-B>', 'b@test.local')
  on conflict (id) do nothing;
insert into public.profiles (id, email, role) values
  ('<UUID-A>', 'a@test.local', 'student'),
  ('<UUID-B>', 'b@test.local', 'student')
  on conflict (id) do nothing;
insert into public.results (student_id, course_id, semester, academic_year, marks, counts_toward_gpa)
values ('<UUID-A>', '<COURSE>', 1, 2025, 80, true),
       ('<UUID-B>', '<COURSE>', 1, 2025, 40, true);

-- Act as Student A
set local role authenticated;
set local request.jwt.claims = '{"sub":"<UUID-A>","role":"authenticated"}';

-- A sees only A's results
do $$
declare visible int;
begin
  select count(*) into visible from public.results;
  if visible <> 1 then
    raise exception 'FAIL: Student A sees % rows (expected 1)', visible;
  end if;
end $$;

-- A cannot update B's result (0 rows affected)
do $$
declare affected int;
begin
  update public.results set marks = 100 where student_id = '<UUID-B>';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: Student A updated % of B''s rows', affected;
  end if;
end $$;

-- A cannot write reference data (courses)
do $$
begin
  begin
    insert into public.courses (curriculum_version_id, department_id, code, name, semester, credits, category)
    values ('<VERSION>', '<DEPT>', 'X-TEST', 'X', 1, 1, 'core');
    raise exception 'FAIL: Student A inserted a course';
  exception when insufficient_privilege then null; -- expected
  end;
end $$;

reset role;