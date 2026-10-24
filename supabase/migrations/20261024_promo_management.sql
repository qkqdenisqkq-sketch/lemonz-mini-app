-- Run this migration on an existing LEMONZ database before deploying the new API.
create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9_-]{4,32}$'),
  percent integer not null check (percent between 1 and 90),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
revoke all on table public.promo_codes from anon, authenticated;
grant all on table public.promo_codes to service_role;

-- One transaction for renaming, enabling and disabling codes. Environment
-- codes can be shadowed with an inactive DB record, preventing resurrection.
create or replace function public.manage_promo_code(
  p_action text,
  p_old_code text,
  p_new_code text,
  p_old_percent integer,
  p_percent integer,
  p_active boolean,
  p_shadow_old boolean
)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_action = 'create' then
    insert into promo_codes(code,percent,active) values(p_new_code,p_percent,true);
  elsif p_action = 'update' then
    if p_old_code = p_new_code then
      update promo_codes set percent=p_percent,updated_at=now() where code=p_old_code;
      if not found then
        insert into promo_codes(code,percent,active) values(p_new_code,p_percent,p_active);
      end if;
    else
      if p_shadow_old then
        insert into promo_codes(code,percent,active) values(p_old_code,p_old_percent,false)
        on conflict(code) do update set active=false,updated_at=now();
      else
        delete from promo_codes where code=p_old_code;
        if not found then raise exception 'Промокод не найден'; end if;
      end if;
      insert into promo_codes(code,percent,active) values(p_new_code,p_percent,p_active);
    end if;
  elsif p_action in ('disable','enable') then
    insert into promo_codes(code,percent,active)
    values(p_old_code,p_old_percent,p_action='enable')
    on conflict(code) do update set active=excluded.active,updated_at=now();
  else
    raise exception 'Неизвестная операция с промокодом';
  end if;
end; $$;

revoke execute on function public.manage_promo_code(text,text,text,integer,integer,boolean,boolean) from public,anon,authenticated;
grant execute on function public.manage_promo_code(text,text,text,integer,integer,boolean,boolean) to service_role;
