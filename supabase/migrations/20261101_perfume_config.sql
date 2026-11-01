-- Execute once in Supabase SQL Editor before deploying the perfume admin API.
create table if not exists public.perfume_config (
  id smallint primary key check (id = 1),
  visible boolean not null default true,
  kits jsonb not null default '[]'::jsonb check (jsonb_typeof(kits) = 'array'),
  version integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.perfume_config (id, visible, kits)
values (1, true, '[
  {"id":"clove","name":"Clove","art":"/Clove.png","previewImage":"","accent":"#f65fae","dark":"#241328"},
  {"id":"jett","name":"Jett","art":"/Jett.png","previewImage":"","accent":"#a6d8fc","dark":"#23344e"},
  {"id":"reyna","name":"Reyna","art":"/Clove.png","previewImage":"","accent":"#b76bf0","dark":"#291237"},
  {"id":"killjoy","name":"Killjoy","art":"/Killjoy.png","previewImage":"","accent":"#f3c84f","dark":"#22252b"},
  {"id":"chamber","name":"Chamber","art":"/Chamber.png","previewImage":"","accent":"#cba28a","dark":"#29202a"}
]'::jsonb)
on conflict (id) do nothing;

-- All reads and writes go through authenticated Vercel endpoints using service_role.
alter table public.perfume_config enable row level security;
revoke all on public.perfume_config from anon, authenticated;
grant all on public.perfume_config to service_role;

-- The existing public Storage bucket 'lemonz-media' is used for uploaded photos.
