-- 0007_profiles.sql
-- Extends Supabase auth.users with academic profile + role.
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text,
  role                 text not null default 'student' check (role in ('student','admin')),
  department_id        uuid references public.departments(id) on delete set null,
  curriculum_version_id uuid references public.curriculum_versions(id) on delete set null,
  intake_year          int,
  faculty              text default 'Faculty of Computing',
  created_at           timestamptz not null default now()
);

comment on table public.profiles is 'Student/admin profiles linked to auth.users.';

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'role', 'student'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current authenticated user an admin?
-- Defined here (after public.profiles exists) so creation-time validation of
-- the SQL body succeeds. SECURITY DEFINER + fixed search_path lets RLS policies
-- read profiles without recursion (the definer runs as the table owner and
-- bypasses RLS). Uses fully-qualified auth.uid().
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;