-- 0020_curriculum_categories.sql
-- Allow the official category labels (Core, Elective, Compulsory,
-- Compulsory (Non-GPA)) while keeping legacy lowercase values valid.
alter table public.courses drop constraint if exists courses_category_check;
alter table public.courses
  add constraint courses_category_check
  check (category in ('Core','Elective','Compulsory','Compulsory (Non-GPA)','core','elective','general','practical','project'));