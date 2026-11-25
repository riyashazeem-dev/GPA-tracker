-- 0001_extensions.sql
-- Required extensions for UUID generation.
create extension if not exists pgcrypto;

-- NOTE: public.is_admin() is defined in 0007_profiles.sql, after the
-- public.profiles table it references exists. Defining it here (before
-- profiles exists) fails with SQLSTATE 42P01 because SQL-language function
-- bodies are validated at creation time.