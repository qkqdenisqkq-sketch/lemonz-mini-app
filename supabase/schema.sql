-- LEMONZ: execute once in the Supabase SQL editor.
-- The service role key must be used only by the serverless API, NEVER by React.
create extension if not exists pgcrypto;

create table if not exists public.seasons (
  id bigint generated always as identity primary key,
  number integer not null unique,
  status text not null check (status in ('active','closed')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '14 days')
);
create unique index if not exists one_active_season on public.seasons(status) where status='active';

create table if not exists public.candidates (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons(id),
  category text not null check (category in ('lemonz','community')),
  name text not null,
  universe text not null,
  image_url text not null default '',
  description text not null default '',
  normalized_key text not null,
  author_id bigint,
  author_username text,
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(season_id,normalized_key)
);
create table if not exists public.votes (
  season_id bigint not null references public.seasons(id),
  user_id bigint not null,
  category text not null check (category in ('lemonz','community')),
  candidate_id bigint not null references public.candidates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(season_id,user_id,category)
);
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons(id),
  candidate_id bigint not null references public.candidates(id) on delete cascade,
  user_id bigint not null,
  username text not null,
  text text not null default '',
  media_url text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.community_bans (
  user_id bigint primary key,
  reason text not null default 'Нарушение правил голосования',
  created_at timestamptz not null default now()
);
create table if not exists public.season_winners (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons(id),
  season_number integer not null,
  category text not null check (category in ('lemonz','community')),
  name text not null,
  universe text not null,
  normalized_key text not null unique,
  author_id bigint,
  author_username text,
  votes_total integer not null,
  discount_code text unique,
  discount_redeemed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(season_id,category)
);

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

create or replace function public.manage_promo_code(
  p_action text, p_old_code text, p_new_code text,
  p_old_percent integer, p_percent integer, p_active boolean, p_shadow_old boolean
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

create table if not exists public.auction_lots (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  size_cm text not null default '',
  image_url text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  one_of_one boolean not null default true,
  start_price integer not null check(start_price>0),
  step integer not null default 500 check(step>0),
  current_bid integer not null default 0 check(current_bid>=0),
  status text not null default 'active' check(status in ('active','awaiting_payment','offered','paid','ended','cancelled')),
  ends_at timestamptz not null,
  winner_id bigint,
  winner_price integer,
  payment_deadline timestamptz,
  offered_to_id bigint,
  offer_price integer,
  offer_deadline timestamptz,
  declined_user_ids bigint[] not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.auction_bids (
  id bigint generated always as identity primary key,
  lot_id bigint not null references public.auction_lots(id),
  user_id bigint not null,
  username text not null,
  amount integer not null check(amount>0),
  created_at timestamptz not null default now()
);
create index if not exists auction_bids_rank on public.auction_bids(lot_id,amount desc,created_at desc);
create table if not exists public.auction_agreements (
  user_id bigint primary key,
  agreed_at timestamptz not null default now()
);
create table if not exists public.auction_bans (
  user_id bigint primary key,
  blocked_until timestamptz not null,
  reason text not null default 'Неоплата победы',
  created_at timestamptz not null default now()
);
create table if not exists public.auction_payment_events (
  id bigint generated always as identity primary key,
  lot_id bigint not null references public.auction_lots(id),
  buyer_id bigint not null,
  amount integer not null,
  event text not null check(event in ('awaiting','defaulted','paid','declined','offered')),
  created_at timestamptz not null default now()
);
create table if not exists public.bot_notifications (
  id bigint generated always as identity primary key,
  user_id bigint not null,
  message text not null,
  event_key text unique,
  sent_at timestamptz,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now()
);

-- No direct client table access. API uses SERVICE_ROLE on the server.
alter table public.seasons enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.community_bans enable row level security;
alter table public.season_winners enable row level security;
alter table public.auction_lots enable row level security;
alter table public.auction_bids enable row level security;
alter table public.auction_agreements enable row level security;
alter table public.auction_bans enable row level security;
alter table public.auction_payment_events enable row level security;
alter table public.bot_notifications enable row level security;

create or replace function public.cast_season_vote(p_user bigint,p_category text,p_candidate bigint)
returns void language plpgsql security definer set search_path=public as $$
declare s public.seasons%rowtype;
begin
  select * into s from seasons where status='active' for update;
  if s.id is null or s.ends_at<=now() then raise exception 'Сезон уже завершён'; end if;
  if exists(select 1 from community_bans where user_id=p_user) then raise exception 'Участие в голосовании ограничено администрацией'; end if;
  if p_category not in ('lemonz','community') then raise exception 'Некорректная категория'; end if;
  if p_candidate is null then
    delete from votes where season_id=s.id and user_id=p_user and category=p_category;
    return;
  end if;
  if not exists(select 1 from candidates where id=p_candidate and season_id=s.id and category=p_category and removed=false) then
    raise exception 'Персонаж недоступен для голосования';
  end if;
  insert into votes(season_id,user_id,category,candidate_id)
  values(s.id,p_user,p_category,p_candidate)
  on conflict(season_id,user_id,category) do update set candidate_id=excluded.candidate_id,created_at=now();
end; $$;

-- A locked, atomic duplicate check prevents two concurrent proposals from
-- claiming the same character. Names are transliterated/aliased by the API.
create or replace function public.key_distance(a text,b text)
returns integer language plpgsql immutable as $$
declare i integer; j integer; prev integer[]; curr integer[];
begin
  if a=b then return 0; end if;
  if abs(length(a)-length(b))>2 then return 3; end if;
  prev:=array_fill(0,array[length(b)+1]);
  for j in 0..length(b) loop prev[j+1]:=j; end loop;
  for i in 1..length(a) loop
    curr:=array_fill(0,array[length(b)+1]); curr[1]:=i;
    for j in 1..length(b) loop
      curr[j+1]:=least(curr[j]+1,prev[j+1]+1,prev[j]+case when substr(a,i,1)=substr(b,j,1) then 0 else 1 end);
    end loop;
    prev:=curr;
  end loop;
  return prev[length(b)+1];
end; $$;

create or replace function public.suggest_candidate(p_user bigint,p_username text,p_name text,p_universe text,p_image text,p_description text,p_key text)
returns void language plpgsql security definer set search_path=public as $$
declare s public.seasons%rowtype;
begin
  perform pg_advisory_xact_lock(876124);
  select * into s from seasons where status='active' for update;
  if s.id is null or s.ends_at<=now() then raise exception 'Сезон завершён'; end if;
  if exists(select 1 from community_bans where user_id=p_user) then raise exception 'Предложения недоступны для этого аккаунта'; end if;
  if length(p_key)<2 or length(p_name)<2 or length(p_universe)<2 then raise exception 'Укажи персонажа и вселенную'; end if;
  if exists(select 1 from candidates where season_id=s.id and
      key_distance(normalized_key,p_key)<=case when greatest(length(normalized_key),length(p_key))>7 then 2 else 1 end)
    or exists(select 1 from season_winners where
      key_distance(normalized_key,p_key)<=case when greatest(length(normalized_key),length(p_key))>7 then 2 else 1 end)
  then raise exception 'Этот персонаж уже предложен или побеждал ранее'; end if;
  insert into candidates(season_id,category,name,universe,image_url,description,normalized_key,author_id,author_username)
  values(s.id,'community',left(p_name,80),left(p_universe,80),p_image,left(p_description,600),left(p_key,80),p_user,left(p_username,80));
end; $$;

create or replace function public.set_lemonz_choices(p_choices jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare s public.seasons%rowtype; choice jsonb;
begin
  select * into s from seasons where status='active' for update;
  if s.id is null or s.ends_at<=now() then raise exception 'Нет активного сезона'; end if;
  if jsonb_typeof(p_choices)<>'array' or jsonb_array_length(p_choices)<>3 then raise exception 'Нужно ровно три персонажа'; end if;
  if exists(select 1 from votes where season_id=s.id and category='lemonz') then raise exception 'Нельзя заменить варианты после начала голосования'; end if;
  delete from candidates where season_id=s.id and category='lemonz';
  for choice in select value from jsonb_array_elements(p_choices) loop
    if nullif(trim(choice->>'normalized_key'),'') is null then raise exception 'Имя обязательно'; end if;
    if exists(select 1 from season_winners where key_distance(normalized_key,choice->>'normalized_key')<=1) then raise exception 'Победители прошлых сезонов исключены'; end if;
    insert into candidates(season_id,category,name,universe,image_url,normalized_key)
    values(s.id,'lemonz',choice->>'name',choice->>'universe',coalesce(choice->>'image_url',''),choice->>'normalized_key');
  end loop;
end; $$;

create or replace function public.advance_season(p_force boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare s public.seasons%rowtype; chosen record; group_name text;
begin
  perform pg_advisory_xact_lock(876123);
  select * into s from seasons where status='active' for update;
  if s.id is null then
    insert into seasons(number,status) values(1,'active');
    return;
  end if;
  if not p_force and s.ends_at>now() then return; end if;
  for group_name in select unnest(array['lemonz','community']) loop
    select c.*, count(v.user_id)::integer as total into chosen from candidates c
    left join votes v on v.candidate_id=c.id
    where c.season_id=s.id and c.category=group_name and c.removed=false
    group by c.id order by count(v.user_id) desc,c.created_at asc,c.id asc limit 1;
    if chosen.id is not null then
      insert into season_winners(season_id,season_number,category,name,universe,normalized_key,author_id,author_username,votes_total,discount_code)
      values(s.id,s.number,group_name,chosen.name,chosen.universe,chosen.normalized_key,chosen.author_id,chosen.author_username,chosen.total,
        case when group_name='community' and chosen.author_id is not null then upper(encode(gen_random_bytes(5),'hex')) else null end);
      if group_name='community' and chosen.author_id is not null then
        insert into bot_notifications(user_id,message,event_key)
        values(chosen.author_id,'🎉 Твоя идея '||chosen.name||' победила в голосовании LEMONZ! Тебе положена персональная скидка 50%. Свяжись с LEMONZ для оформления.',
        'winner-'||s.id||'-community') on conflict(event_key) do nothing;
      end if;
    end if;
  end loop;
  update seasons set status='closed' where id=s.id;
  insert into seasons(number,status,starts_at,ends_at) values(s.number+1,'active',now(),now()+interval '14 days');
end; $$;

create or replace function public.place_auction_bid(p_user bigint,p_username text,p_lot bigint,p_amount integer)
returns void language plpgsql security definer set search_path=public as $$
declare l public.auction_lots%rowtype; prev_user bigint; minimum integer;
begin
  select * into l from auction_lots where id=p_lot for update;
  if l.id is null or l.status<>'active' or l.ends_at<=now() then raise exception 'Аукцион уже завершён'; end if;
  if not exists(select 1 from auction_agreements where user_id=p_user) then raise exception 'Подтверди условия участия'; end if;
  if exists(select 1 from auction_bans where user_id=p_user and blocked_until>now()) then raise exception 'Доступ к ставкам временно заблокирован'; end if;
  minimum:=case when l.current_bid=0 then l.start_price else l.current_bid+l.step end;
  if p_amount<minimum or p_amount<=0 then raise exception 'Ставка ниже допустимого минимума: % ₽',minimum; end if;
  select user_id into prev_user from auction_bids where lot_id=p_lot order by amount desc,id desc limit 1;
  insert into auction_bids(lot_id,user_id,username,amount) values(p_lot,p_user,left(p_username,80),p_amount);
  update auction_lots set current_bid=p_amount,ends_at=case when ends_at<=now()+interval '2 minutes' then ends_at+interval '2 minutes' else ends_at end where id=p_lot;
  if prev_user is not null and prev_user<>p_user then
    insert into bot_notifications(user_id,message) values(prev_user,'⚡ Твою ставку на '||l.title||' перебили. Новая ставка: '||p_amount||' ₽.');
  end if;
end; $$;

create or replace function public.advance_auction_offer(p_lot bigint)
returns void language plpgsql security definer set search_path=public as $$
declare l public.auction_lots%rowtype; next_user bigint; next_price integer;
begin
  select * into l from auction_lots where id=p_lot for update;
  select user_id,max(amount) into next_user,next_price from auction_bids
  where lot_id=p_lot and not(user_id=any(l.declined_user_ids))
  group by user_id order by max(amount) desc limit 1;
  if next_user is null then
    update auction_lots set status='ended',offered_to_id=null,offer_price=null,offer_deadline=null where id=p_lot;
  else
    update auction_lots set status='offered',offered_to_id=next_user,offer_price=next_price,offer_deadline=now()+interval '24 hours' where id=p_lot;
    insert into auction_payment_events(lot_id,buyer_id,amount,event) values(p_lot,next_user,next_price,'offered');
    insert into bot_notifications(user_id,message) values(next_user,'✨ Тебе предложили выкупить '||l.title||' за '||next_price||' ₽. Открой LEMONZ Mini App и прими или отклони предложение за 24 часа. Отказ без штрафа.');
  end if;
end; $$;

create or replace function public.respond_auction_offer(p_user bigint,p_lot bigint,p_accept boolean)
returns void language plpgsql security definer set search_path=public as $$
declare l public.auction_lots%rowtype;
begin
  select * into l from auction_lots where id=p_lot for update;
  if l.id is null or l.status<>'offered' or l.offered_to_id<>p_user or l.offer_deadline<=now() then raise exception 'Предложение больше недоступно'; end if;
  if p_accept then
    update auction_lots set status='awaiting_payment',winner_id=p_user,winner_price=l.offer_price,payment_deadline=now()+interval '24 hours',offered_to_id=null,offer_price=null,offer_deadline=null where id=p_lot;
    insert into auction_payment_events(lot_id,buyer_id,amount,event) values(p_lot,p_user,l.offer_price,'awaiting');
    insert into bot_notifications(user_id,message) values(p_user,'✅ Ты принял предложение на '||l.title||'. Оплати '||l.offer_price||' ₽ в течение 24 часов.');
  else
    update auction_lots set declined_user_ids=array_append(l.declined_user_ids,p_user) where id=p_lot;
    insert into auction_payment_events(lot_id,buyer_id,amount,event) values(p_lot,p_user,l.offer_price,'declined');
    perform advance_auction_offer(p_lot);
  end if;
end; $$;

create or replace function public.mark_auction_paid(p_lot bigint)
returns void language plpgsql security definer set search_path=public as $$
declare l public.auction_lots%rowtype;
begin
  select * into l from auction_lots where id=p_lot for update;
  if l.id is null or l.status<>'awaiting_payment' or l.winner_id is null then raise exception 'Нет ожидаемого платежа'; end if;
  update auction_lots set status='paid',payment_deadline=null where id=p_lot;
  insert into auction_payment_events(lot_id,buyer_id,amount,event) values(p_lot,l.winner_id,l.winner_price,'paid');
  insert into bot_notifications(user_id,message) values(l.winner_id,'💜 Оплата за '||l.title||' подтверждена. Спасибо за участие в аукционе LEMONZ!');
end; $$;

create or replace function public.redeem_winner_discount(p_code text,p_user bigint)
returns void language plpgsql security definer set search_path=public as $$
declare updated integer;
begin
  update season_winners set discount_redeemed=true
  where discount_code=upper(trim(p_code)) and author_id=p_user and category='community' and discount_redeemed=false;
  get diagnostics updated=row_count;
  if updated<>1 then raise exception 'Скидка недействительна или уже использована'; end if;
end; $$;

create or replace function public.settle_auctions()
returns void language plpgsql security definer set search_path=public as $$
declare l public.auction_lots%rowtype; best_user bigint; best_amount integer;
begin
  perform pg_advisory_xact_lock(987234);
  for l in select * from auction_lots where status='active' and ends_at<=now() order by id for update loop
    select user_id,amount into best_user,best_amount from auction_bids where lot_id=l.id order by amount desc,id desc limit 1;
    if best_user is null then
      update auction_lots set status='ended' where id=l.id;
    else
      update auction_lots set status='awaiting_payment',winner_id=best_user,winner_price=best_amount,payment_deadline=now()+interval '24 hours' where id=l.id;
      insert into auction_payment_events(lot_id,buyer_id,amount,event) values(l.id,best_user,best_amount,'awaiting');
      insert into bot_notifications(user_id,message) values(best_user,'🏆 Ты победил в аукционе LEMONZ! '||l.title||' за '||best_amount||' ₽. Оплати в течение 24 часов. Неоплата = 30 дней без ставок.');
    end if;
  end loop;
  for l in select * from auction_lots where status='awaiting_payment' and payment_deadline<=now() order by id for update loop
    insert into auction_bans(user_id,blocked_until,reason) values(l.winner_id,now()+interval '30 days','Неоплата аукциона')
    on conflict(user_id) do update set blocked_until=greatest(auction_bans.blocked_until,excluded.blocked_until),reason=excluded.reason;
    insert into auction_payment_events(lot_id,buyer_id,amount,event) values(l.id,l.winner_id,l.winner_price,'defaulted');
    update auction_lots set declined_user_ids=array_append(l.declined_user_ids,l.winner_id) where id=l.id;
    insert into bot_notifications(user_id,message) values(l.winner_id,'Увы, время оплаты '||l.title||' истекло. Доступ к ставкам заблокирован на 30 дней.');
    perform advance_auction_offer(l.id);
  end loop;
  for l in select * from auction_lots where status='offered' and offer_deadline<=now() order by id for update loop
    update auction_lots set declined_user_ids=array_append(l.declined_user_ids,l.offered_to_id) where id=l.id;
    perform advance_auction_offer(l.id);
  end loop;
  for l in select * from auction_lots where status='awaiting_payment' and payment_deadline>now() and payment_deadline<now()+interval '4 hours' loop
    insert into bot_notifications(user_id,message,event_key)
    values(l.winner_id,'⏰ Напоминание: менее 4 часов на оплату '||l.title||'.','reminder-'||l.id||'-'||l.winner_id||'-'||l.payment_deadline)
    on conflict(event_key) do nothing;
  end loop;
end; $$;

-- Create the first season on first install; all next seasons are created by advance_season().
insert into public.seasons(number,status) values(1,'active') on conflict(number) do nothing;
-- Prevent direct unsigned RPC calls even if someone knows the public anon key.
revoke execute on function public.cast_season_vote(bigint,text,bigint) from public,anon,authenticated;
revoke execute on function public.suggest_candidate(bigint,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.set_lemonz_choices(jsonb) from public,anon,authenticated;
revoke execute on function public.advance_season(boolean) from public,anon,authenticated;
revoke execute on function public.place_auction_bid(bigint,text,bigint,integer) from public,anon,authenticated;
revoke execute on function public.advance_auction_offer(bigint) from public,anon,authenticated;
revoke execute on function public.respond_auction_offer(bigint,bigint,boolean) from public,anon,authenticated;
revoke execute on function public.mark_auction_paid(bigint) from public,anon,authenticated;
revoke execute on function public.settle_auctions() from public,anon,authenticated;
revoke execute on function public.key_distance(text,text) from public,anon,authenticated;
revoke execute on function public.redeem_winner_discount(text,bigint) from public,anon,authenticated;
grant execute on function public.cast_season_vote(bigint,text,bigint), public.suggest_candidate(bigint,text,text,text,text,text,text),public.set_lemonz_choices(jsonb),public.advance_season(boolean),public.place_auction_bid(bigint,text,bigint,integer),public.advance_auction_offer(bigint),public.respond_auction_offer(bigint,bigint,boolean),public.mark_auction_paid(bigint),public.settle_auctions(),public.key_distance(text,text),public.redeem_winner_discount(text,bigint) to service_role;
-- In Supabase Storage, create a PUBLIC bucket named lemonz-media with 4 MB file limit.
-- Set the 3 LEMONZ candidates from the admin screen before opening the vote.
