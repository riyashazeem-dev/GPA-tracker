-- 0012_indexes.sql
-- Performance indexes for common query paths.
create index idx_courses_dept_semester      on public.courses (department_id, semester);
create index idx_courses_version            on public.courses (curriculum_version_id);
create index idx_courses_is_elective        on public.courses (is_elective);
create index idx_results_student            on public.results (student_id);
create index idx_results_course             on public.results (course_id);
create index idx_results_student_year       on public.results (student_id, academic_year);
create index idx_elective_sel_student       on public.student_elective_selections (student_id);
create index idx_elective_sel_course        on public.student_elective_selections (course_id);
create index idx_repeat_result              on public.repeat_exam_records (result_id);
create index idx_elective_req_dept_sem      on public.elective_requirements (department_id, semester);