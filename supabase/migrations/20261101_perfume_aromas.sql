-- Run after 20261101_perfume_config.sql in Supabase SQL Editor.
-- Existing kits and visibility remain unchanged.
alter table public.perfume_config
  add column if not exists perfumes jsonb;
alter table public.perfume_config
  drop constraint if exists perfume_config_perfumes_array;
alter table public.perfume_config
  add constraint perfume_config_perfumes_array
  check (perfumes is null or jsonb_typeof(perfumes) = 'array');

-- NULL is intentional: the API displays the 50 built-in scents until the
-- administrator makes the first change. Subsequent edits store a complete list.
-- The API authorizes changes using signed Telegram initData and server role.
