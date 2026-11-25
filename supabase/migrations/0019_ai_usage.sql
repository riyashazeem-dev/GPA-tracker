-- 0019_ai_usage.sql
-- Per-user AI request counters for basic rate limiting (one row per minute window).
create table if not exists public.ai_usage (
  user_id      uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  count        int not null default 1,
  primary key (user_id, window_start)
);

alter table public.ai_usage enable row level security;

create policy ai_usage_self on public.ai_usage
  for select to authenticated using (user_id = auth.uid() or public.is_admin());