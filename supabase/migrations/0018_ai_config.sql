-- 0018_ai_config.sql
-- Admin-configurable AI model settings (single row). API keys are NOT stored
-- here; the OpenRouter key lives only as an Edge Function secret.
create table public.ai_config (
  id             int primary key default 1 check (id = 1),
  model          text not null default 'meta-llama/llama-3.3-70b-instruct:free',
  fallback_model text not null default 'google/gemini-2.0-flash-exp:free',
  updated_at     timestamptz not null default now()
);

insert into public.ai_config (id) values (1) on conflict (id) do nothing;

alter table public.ai_config enable row level security;

create policy ai_config_read on public.ai_config
  for select to authenticated using (true);

create policy ai_config_admin on public.ai_config
  for update to authenticated using (public.is_admin()) with check (public.is_admin());