-- 0014_rls.sql
-- Row Level Security for all tables.
alter table public.departments                 enable row level security;
alter table public.semesters                   enable row level security;
alter table public.curriculum_versions         enable row level security;
alter table public.courses                     enable row level security;
alter table public.elective_requirements       enable row level security;
alter table public.profiles                    enable row level security;
alter table public.grading_scales              enable row level security;
alter table public.grade_points                enable row level security;
alter table public.results                     enable row level security;
alter table public.student_elective_selections enable row level security;
alter table public.repeat_exam_records         enable row level security;

-- Reference data: readable by authenticated users; writable by admins.
create policy departments_read   on public.departments           for select to authenticated using (true);
create policy departments_admin  on public.departments           for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy semesters_read     on public.semesters             for select to authenticated using (true);
create policy semesters_admin    on public.semesters             for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy versions_read      on public.curriculum_versions   for select to authenticated using (true);
create policy versions_admin     on public.curriculum_versions   for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy courses_read       on public.courses               for select to authenticated using (true);
create policy courses_admin      on public.courses               for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy elective_req_read  on public.elective_requirements for select to authenticated using (true);
create policy elective_req_admin on public.elective_requirements for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy grading_read       on public.grading_scales        for select to authenticated using (true);
create policy grading_admin      on public.grading_scales        for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy grade_points_read  on public.grade_points          for select to authenticated using (true);
create policy grade_points_admin on public.grade_points          for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profiles: own row or admin.
create policy profiles_self      on public.profiles              for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update    on public.profiles              for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Results: owner full access; admin read.
create policy results_owner      on public.results               for all    to authenticated using (student_id = auth.uid() or public.is_admin()) with check (student_id = auth.uid() or public.is_admin());

-- Elective selections: owner full access; admin read.
create policy selections_owner   on public.student_elective_selections for all to authenticated using (student_id = auth.uid() or public.is_admin()) with check (student_id = auth.uid() or public.is_admin());

-- Repeat records: visible via owning result; admin all.
create policy repeats_owner      on public.repeat_exam_records   for all    to authenticated using (
  public.is_admin() or exists (select 1 from public.results r where r.id = result_id and r.student_id = auth.uid())
) with check (
  public.is_admin() or exists (select 1 from public.results r where r.id = result_id and r.student_id = auth.uid())
);