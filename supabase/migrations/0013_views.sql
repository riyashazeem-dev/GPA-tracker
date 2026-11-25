-- 0013_views.sql
-- Authoritative GPA eligibility view.
-- A result counts toward GPA when ALL hold:
--   1. course.gpa_eligible = true            (Non-GPA modules excluded)
--   2. course.credits is not null            (missing numerical credit excluded)
--   3. if course.is_elective, the student   (unselected electives excluded)
--      actually registered for it that year
-- Categories are preserved via c.category. Electives with numerical credits
-- (e.g. Communication Skills / English) are NOT auto-excluded.
create or replace view public.v_gpa_eligible_results
with (security_invoker = true) as
select
  r.id                as result_id,
  r.student_id,
  r.course_id,
  c.code              as course_code,
  c.name              as course_name,
  c.category          as category,
  c.credits           as credits,
  c.is_elective       as is_elective,
  r.semester,
  r.academic_year,
  r.marks,
  r.letter_grade,
  r.grade_point,
  r.is_repeat
from public.results r
join public.courses c on c.id = r.course_id
where c.gpa_eligible = true
  and c.credits is not null
  and (
    c.is_elective = false
    or exists (
      select 1 from public.student_elective_selections s
      where s.student_id = r.student_id
        and s.course_id  = r.course_id
        and s.academic_year = r.academic_year
    )
  );

comment on view public.v_gpa_eligible_results is 'Results that count toward GPA per eligibility rules.';