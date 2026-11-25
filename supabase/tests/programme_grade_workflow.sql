-- This test uses synthetic accounts and rolls back all writes.
begin;

insert into auth.users (id, email, raw_app_meta_data) values
  ('a082a250-8f71-4b64-8317-2a24f9af3798', 'gpa-workflow-a@example.invalid', '{"provider":"google"}'),
  ('29857c29-b8ff-44c8-9b67-a6aef6ae2fc2', 'gpa-workflow-b@example.invalid', '{"provider":"google"}');

set local role authenticated;

do $$
declare
  student_a constant uuid := 'a082a250-8f71-4b64-8317-2a24f9af3798';
  student_b constant uuid := '29857c29-b8ff-44c8-9b67-a6aef6ae2fc2';
  programme uuid;
  curriculum uuid;
  other_programme uuid;
  module_a uuid;
  module_b uuid;
  grade_id uuid;
  affected integer;
  claims_a text := jsonb_build_object('sub', student_a, 'role', 'authenticated',
    'app_metadata', jsonb_build_object('provider', 'google'))::text;
begin
  perform set_config('request.jwt.claims', claims_a, true);
  select d.id, v.id into strict programme, curriculum
  from public.departments d join public.curriculum_versions v on v.department_id = d.id
  where d.code = 'IS' and v.version = 'official';

  update public.profiles set department_id = programme, curriculum_version_id = curriculum, current_semester = 1
  where id = student_a;
  if not found then raise exception 'New student profile was not created.'; end if;

  select id into strict other_programme from public.departments where code = 'DS';
  begin
    update public.profiles set department_id = other_programme where id = student_a;
    raise exception 'Programme was changed.' using errcode = 'ZX001';
  exception when raise_exception then
    if sqlerrm <> 'Your degree programme is already saved.' then raise; end if;
  end;

  select id into strict module_a from public.courses where curriculum_version_id = curriculum and code = 'IS1101';
  select id into strict module_b from public.courses where curriculum_version_id = curriculum and code = 'IS1102';
  perform public.save_semester_grades(1, jsonb_build_object(module_a::text, 'E'));
  select id into strict grade_id from public.results
  where course_id = module_a and grade_point = 0 and counts_toward_gpa and not is_predicted;

  begin
    perform public.save_semester_grades(1, jsonb_build_object(module_a::text, 'A', module_b::text, 'invalid'));
    raise exception 'Invalid batch unexpectedly succeeded.' using errcode = 'ZX002';
  exception when raise_exception then
    if sqlerrm <> 'A grade or module does not match your selected semester.' then raise; end if;
  end;
  if not exists (select 1 from public.results where id = grade_id and letter_grade = 'E') then
    raise exception 'An invalid batch partially changed a grade.';
  end if;

  perform public.save_semester_grades(1, jsonb_build_object(module_a::text, 'A-', module_b::text, 'B+'));
  perform public.save_semester_grades(1, jsonb_build_object(module_a::text, 'A-'));
  if (select count(*) from public.results where course_id = module_a) <> 1 then
    raise exception 'Saving a correction duplicated a module.';
  end if;

  perform public.save_semester_grades(1, jsonb_build_object(module_b::text, null));
  if not exists (select 1 from public.results where course_id = module_b and letter_grade is null
      and grade_point is null and not counts_toward_gpa) then
    raise exception 'Clearing a grade did not restore Pending.';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', student_b, 'role', 'authenticated',
    'app_metadata', jsonb_build_object('provider', 'google'))::text, true);
  if exists (select 1 from public.profiles where id = student_a) or
     exists (select 1 from public.results where id = grade_id) then
    raise exception 'A second account can read private records.';
  end if;
  update public.results set letter_grade = 'E' where id = grade_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A second account changed a private result.'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', student_a, 'role', 'authenticated',
    'app_metadata', jsonb_build_object('provider', 'email'))::text, true);
  if exists (select 1 from public.results where id = grade_id) then
    raise exception 'A non-Google session can read grades.';
  end if;

  perform set_config('request.jwt.claims', claims_a, true);
  if not exists (select 1 from public.results where id = grade_id and letter_grade = 'A-' and grade_point = 3.7) then
    raise exception 'The original account could not restore its corrected grade.';
  end if;
end;
$$;

rollback;
select 'Programme selection, grade saving, persistence and account isolation passed' as status;
