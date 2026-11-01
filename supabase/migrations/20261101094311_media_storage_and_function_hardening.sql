-- Public downloads are required for product and community images.
-- Uploads remain server-only; no storage.objects policies are added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lemonz-media', 'lemonz-media', true, 4194304,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

alter function public.key_distance(text, text) set search_path = public;
-- Supabase installs pgcrypto in extensions. Prize-code generation needs it.
alter function public.advance_season(boolean) set search_path = public, extensions;
