-- Preserve historical duplicate rows and their dependent repeat attempts.
alter table public.results add column is_superseded boolean not null default false;

with ranked as (
  select id, row_number() over (
    partition by student_id, course_id, is_predicted
    order by (letter_grade is not null or grade_point is not null or marks is not null) desc,
             academic_year desc, created_at desc, id desc
  ) as position
  from public.results
)
update public.results r set is_superseded = true
from ranked where r.id = ranked.id and ranked.position > 1;

create unique index results_active_student_course_kind
  on public.results (student_id, course_id, is_predicted) where not is_superseded;

alter policy profiles_self on public.profiles using (id = auth.uid());
alter policy profiles_update on public.profiles using (id = auth.uid()) with check (id = auth.uid());
alter policy results_owner on public.results
  using (student_id = auth.uid() and not is_superseded)
  with check (
    student_id = auth.uid() and not is_superseded and exists (
      select 1 from public.profiles p join public.courses c
        on c.department_id = p.department_id and c.curriculum_version_id = p.curriculum_version_id
      where p.id = auth.uid() and c.id = results.course_id and c.semester = results.semester
    )
  );
alter policy selections_owner on public.student_elective_selections
  using (student_id = auth.uid()) with check (student_id = auth.uid());
alter policy prediction_settings_owner on public.prediction_settings
  using (student_id = auth.uid()) with check (student_id = auth.uid());
alter policy repeats_owner on public.repeat_exam_records
  using (exists (select 1 from public.results r where r.id = result_id and r.student_id = auth.uid()))
  with check (exists (select 1 from public.results r where r.id = result_id and r.student_id = auth.uid()));

-- The application accepts student sessions issued through Google.
create policy google_profiles on public.profiles as restrictive for all to authenticated
  using ((select auth.jwt()->'app_metadata'->>'provider') = 'google')
  with check ((select auth.jwt()->'app_metadata'->>'provider') = 'google');
create policy google_results on public.results as restrictive for all to authenticated
  using ((select auth.jwt()->'app_metadata'->>'provider') = 'google')
  with check ((select auth.jwt()->'app_metadata'->>'provider') = 'google');
create policy google_selections on public.student_elective_selections as restrictive for all to authenticated
  using ((select auth.jwt()->'app_metadata'->>'provider') = 'google')
  with check ((select auth.jwt()->'app_metadata'->>'provider') = 'google');
create policy google_predictions on public.prediction_settings as restrictive for all to authenticated
  using ((select auth.jwt()->'app_metadata'->>'provider') = 'google')
  with check ((select auth.jwt()->'app_metadata'->>'provider') = 'google');

create function public.protect_student_programme()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is distinct from old.id then return new; end if;
  if old.department_id is not null and new.department_id is distinct from old.department_id then
    raise exception 'Your degree programme is already saved.';
  end if;
  if old.curriculum_version_id is not null and new.curriculum_version_id is distinct from old.curriculum_version_id then
    raise exception 'Your curriculum is already saved.';
  end if;
  if not exists (
    select 1 from public.curriculum_versions v
    join public.departments d on d.id = v.department_id
    where v.id = new.curriculum_version_id and d.id = new.department_id and d.code in ('IS', 'SE', 'DS')
  ) then
    raise exception 'Choose a valid degree programme.';
  end if;
  return new;
end;
$$;

create trigger protect_student_programme
  before update of department_id, curriculum_version_id on public.profiles
  for each row execute function public.protect_student_programme();

-- E is a graded zero under the existing GPA rules.
update public.grade_points g set counts_toward_gpa = true
from public.grading_scales s
where s.id = g.scale_id and s.name = 'Official University Scale' and g.label = 'E';

-- Validate and apply a semester's changed grades in one transaction as the student.
create function public.save_semester_grades(p_semester integer, p_grades jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  student uuid := auth.uid();
  scale uuid;
begin
  if student is null or auth.jwt()->'app_metadata'->>'provider' is distinct from 'google' then
    raise exception 'Sign in with Google to save your grades.';
  end if;
  if p_semester is null or p_semester not between 1 and 8 or jsonb_typeof(p_grades) is distinct from 'object' then
    raise exception 'Invalid semester or grades.';
  end if;

  select id into scale from public.grading_scales
  where name = 'Official University Scale' and is_active order by created_at desc, id limit 1;
  if scale is null then raise exception 'The official grading scale is unavailable.'; end if;

  if exists (
    select 1 from jsonb_each_text(p_grades) entry
    where not exists (
      select 1 from public.profiles p join public.courses c
        on c.department_id = p.department_id and c.curriculum_version_id = p.curriculum_version_id
      where p.id = student and c.id = entry.key::uuid and c.semester = p_semester
    ) or (entry.value is not null and not exists (
      select 1 from public.grade_points g where g.scale_id = scale and g.label = entry.value
    ))
  ) then
    raise exception 'A grade or module does not match your selected semester.';
  end if;

  insert into public.results as current_result (
    student_id, course_id, semester, academic_year, letter_grade, grade_point, counts_toward_gpa
  )
  select student, c.id, c.semester, coalesce(existing.academic_year, extract(year from current_date)::integer),
    entry.value, g.grade_point,
    g.grade_point is not null and c.gpa_eligible and c.credits is not null and (
      not c.is_elective or exists (
        select 1 from public.student_elective_selections e
        where e.student_id = student and e.course_id = c.id
          and e.academic_year = coalesce(existing.academic_year, extract(year from current_date)::integer)
      )
    )
  from jsonb_each_text(p_grades) entry
  join public.courses c on c.id = entry.key::uuid
  left join public.grade_points g on g.scale_id = scale and g.label = entry.value
  left join public.results existing on existing.student_id = student and existing.course_id = c.id
    and not existing.is_predicted and not existing.is_superseded
  where entry.value is not null or existing.id is not null
  order by c.id
  on conflict (student_id, course_id, is_predicted) where not is_superseded do update
    set marks = case when current_result.letter_grade is not distinct from excluded.letter_grade
                    and excluded.letter_grade is not null then current_result.marks else null end,
        letter_grade = excluded.letter_grade,
        grade_point = excluded.grade_point,
        counts_toward_gpa = excluded.counts_toward_gpa;

  if exists (select 1 from jsonb_each_text(p_grades) entry where entry.value is not null) then
    update public.profiles set current_semester = greatest(current_semester, p_semester)
    where id = student and (current_semester is null or current_semester < p_semester);
  end if;
end;
$$;

revoke execute on function public.save_semester_grades(integer, jsonb) from public, anon;
grant execute on function public.save_semester_grades(integer, jsonb) to authenticated;
