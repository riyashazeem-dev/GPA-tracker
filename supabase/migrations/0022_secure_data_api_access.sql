-- Assign new users the database default role regardless of signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Explicit Data API access. RLS still governs access to individual rows.
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table
  public.departments, public.semesters, public.curriculum_versions,
  public.courses, public.elective_requirements, public.grading_scales,
  public.grade_points, public.results, public.student_elective_selections,
  public.repeat_exam_records, public.prediction_settings
to authenticated;

revoke insert, update, delete on table public.profiles from public, anon, authenticated;
revoke update (id, email, role, created_at) on table public.profiles
  from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (department_id, curriculum_version_id, current_semester, intake_year, faculty)
  on table public.profiles to authenticated;

grant select on table public.v_gpa_eligible_results, public.ai_usage to authenticated;
grant select, update on table public.ai_config to authenticated;
grant select on table public.ai_config to service_role;
grant select, insert, update on table public.ai_usage to service_role;
