
create extension if not exists pgcrypto;

-- =====================================================
-- 1) FIX ROLETA (cor e par/ímpar pagam sempre que acerta)
-- =====================================================
create or replace function public.play_roulette(_bet numeric, _kind text, _value text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  _uid uuid := auth.uid();
  _num int; _color text;
  _win numeric := 0; _bal numeric;
  _hit boolean := false;
begin
  if _kind not in ('number','color','parity') then raise exception 'invalid_kind'; end if;
  _bal := public._charge_bet(_uid, _bet, 'Roleta');
  _num := floor(random() * 37)::int;
  if _num = 0 then _color := 'green';
  elsif _num % 2 = 0 then _color := 'black';
  else _color := 'red';
  end if;
  if _kind = 'number' then
    if _num::text = _value then _hit := true; _win := round(_bet * 35, 2); end if;
  elsif _kind = 'color' then
    if _color = _value then _hit := true; _win := round(_bet * 2, 2); end if;
  elsif _kind = 'parity' then
    if _num <> 0 and ((_num % 2 = 0 and _value='par') or (_num % 2 = 1 and _value='impar')) then
      _hit := true; _win := round(_bet * 1, 2);
    end if;
  end if;
  if _hit then
    _bal := public._credit_win(_uid, _win, 'Roleta', 'Roleta ' || _num::text || ' ' || _color);
  end if;
  return jsonb_build_object('number', _num, 'color', _color, 'win', _win, 'balance', _bal);
end;$$;

-- =====================================================
-- 2) FIX CRASH already_resolved (reveal não finaliza)
-- =====================================================
create or replace function public.crash_reveal(_round_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare _r public.crash_rounds%rowtype;
begin
  select * into _r from public.crash_rounds where id=_round_id and user_id=auth.uid();
  if not found then raise exception 'not_found'; end if;
  return jsonb_build_object('crash_point', _r.crash_point, 'resolved', _r.resolved);
end;$$;

-- =====================================================
-- 3) CAIXAS PREMIADAS nova regra (6 caixas, escolhe meta, X = perde)
-- =====================================================
create table if not exists public.boxes_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bet numeric not null,
  target_count int not null check (target_count between 1 and 3),
  outcomes numeric[] not null,    -- 6 valores; -1 representa X
  picks int[] not null default array[]::int[],
  resolved boolean not null default false,
  win numeric not null default 0,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.boxes_rounds enable row level security;
drop policy if exists "users read own boxes_rounds" on public.boxes_rounds;
create policy "users read own boxes_rounds" on public.boxes_rounds for select to authenticated using (user_id = auth.uid());

create or replace function public.boxes_start(_bet numeric, _target int)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  _uid uuid := auth.uid();
  _bal numeric; _new numeric; _id uuid;
  _outs numeric[] := array[]::numeric[];
  _i int; _r double precision; _m numeric;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _target is null or _target < 1 or _target > 3 then raise exception 'invalid_target'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;
  select amount into _bal from public.balances where user_id=_uid for update;
  if coalesce(_bal,0) < _bet then raise exception 'insufficient_balance'; end if;
  _new := round(_bal - _bet, 2);
  update public.balances set amount=_new, updated_at=now() where user_id=_uid;
  insert into public.history(user_id,type,game,amount,balance_after,note)
    values (_uid,'bet','Caixas Premiadas',-_bet,_new,'Meta '||_target::text);
  for _i in 1..6 loop
    _r := random();
    if _r < 0.40 then _m := -1;       -- X (40%)
    elsif _r < 0.70 then _m := 1.2;
    elsif _r < 0.88 then _m := 1.8;
    elsif _r < 0.97 then _m := 3;
    else _m := 8;
    end if;
    _outs := _outs || _m;
  end loop;
  insert into public.boxes_rounds(user_id,bet,target_count,outcomes)
    values (_uid,_bet,_target,_outs) returning id into _id;
  return jsonb_build_object('round_id',_id,'target',_target,'balance',_new);
end;$$;

create or replace function public.boxes_pick(_round_id uuid, _index int)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  _uid uuid := auth.uid();
  _r public.boxes_rounds%rowtype;
  _m numeric; _bal numeric; _won numeric := 0;
  _is_x boolean := false; _done boolean := false;
  _total_mult numeric := 0; _i int;
begin
  select * into _r from public.boxes_rounds where id=_round_id and user_id=_uid for update;
  if not found then raise exception 'not_found'; end if;
  if _r.resolved then raise exception 'already_resolved'; end if;
  if _index < 0 or _index > 5 then raise exception 'invalid_index'; end if;
  if _index = any(_r.picks) then raise exception 'already_picked'; end if;

  _m := _r.outcomes[_index+1];
  _r.picks := _r.picks || _index;
  _is_x := (_m = -1);

  if _is_x then
    _done := true;
    update public.boxes_rounds set picks=_r.picks, resolved=true, resolved_at=now() where id=_r.id;
    select amount into _bal from public.balances where user_id=_uid;
    return jsonb_build_object('mult',0,'is_x',true,'done',true,'win',0,'balance',_bal,'picks',to_jsonb(_r.picks));
  end if;

  if array_length(_r.picks,1) >= _r.target_count then
    -- alcançou a meta sem X → calcula prêmio
    foreach _i in array _r.picks loop
      _total_mult := _total_mult + _r.outcomes[_i+1];
    end loop;
    _won := round(_r.bet * _total_mult, 2);
    select amount into _bal from public.balances where user_id=_uid for update;
    update public.balances set amount=round(_bal+_won,2), updated_at=now() where user_id=_uid;
    insert into public.history(user_id,type,game,amount,balance_after,note)
      values (_uid,'win','Caixas Premiadas',_won,round(_bal+_won,2),'Meta x'||_total_mult::text);
    update public.boxes_rounds set picks=_r.picks, resolved=true, resolved_at=now(), win=_won where id=_r.id;
    select amount into _bal from public.balances where user_id=_uid;
    _done := true;
    return jsonb_build_object('mult',_m,'is_x',false,'done',true,'win',_won,'balance',_bal,'picks',to_jsonb(_r.picks),'total_mult',_total_mult);
  end if;

  update public.boxes_rounds set picks=_r.picks where id=_r.id;
  select amount into _bal from public.balances where user_id=_uid;
  return jsonb_build_object('mult',_m,'is_x',false,'done',false,'win',0,'balance',_bal,'picks',to_jsonb(_r.picks));
end;$$;

-- antiga play_boxes mantida só para compatibilidade — não usada mais
drop function if exists public.play_boxes(numeric, integer);

-- =====================================================
-- 4) CAVALOS MULTIPLAYER
-- =====================================================
create table if not exists public.horse_rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting',
  winner int,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create table if not exists public.horse_bets (
  room_id uuid not null references public.horse_rooms(id) on delete cascade,
  user_id uuid not null,
  user_email text,
  horse int not null check (horse between 1 and 6),
  bet numeric not null,
  win numeric not null default 0,
  joined_at timestamptz not null default now(),
  primary key(room_id, user_id)
);
alter table public.horse_rooms enable row level security;
alter table public.horse_bets enable row level security;
drop policy if exists "auth read horse_rooms" on public.horse_rooms;
create policy "auth read horse_rooms" on public.horse_rooms for select to authenticated using (true);
drop policy if exists "auth read horse_bets" on public.horse_bets;
create policy "auth read horse_bets" on public.horse_bets for select to authenticated using (true);

alter publication supabase_realtime add table public.horse_rooms;
alter publication supabase_realtime add table public.horse_bets;

create or replace function public.horse_join(_bet numeric, _horse int)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  _uid uuid := auth.uid();
  _email text;
  _bal numeric; _new numeric;
  _room public.horse_rooms%rowtype;
  _count int;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;
  if _horse < 1 or _horse > 6 then raise exception 'invalid_horse'; end if;
  select email into _email from public.profiles where id=_uid;

  -- procura sala em espera onde user ainda não entrou
  select r.* into _room from public.horse_rooms r
    where r.status='waiting'
      and not exists (select 1 from public.horse_bets b where b.room_id=r.id and b.user_id=_uid)
      and (select count(*) from public.horse_bets b where b.room_id=r.id) < 6
    order by r.created_at asc limit 1;
  if not found then
    insert into public.horse_rooms default values returning * into _room;
  end if;

  -- cobra a aposta
  select amount into _bal from public.balances where user_id=_uid for update;
  if coalesce(_bal,0) < _bet then raise exception 'insufficient_balance'; end if;
  _new := round(_bal - _bet, 2);
  update public.balances set amount=_new, updated_at=now() where user_id=_uid;
  insert into public.history(user_id,type,game,amount,balance_after,note)
    values (_uid,'bet','Cavalos',-_bet,_new,'Cavalo '||_horse::text);
  insert into public.horse_bets(room_id,user_id,user_email,horse,bet) values (_room.id,_uid,_email,_horse,_bet);

  -- se 6 jogadores → inicia
  select count(*) into _count from public.horse_bets where room_id=_room.id;
  if _count >= 6 then
    perform public._horse_run(_room.id);
  end if;

  return jsonb_build_object('room_id',_room.id,'balance',_new);
end;$$;

create or replace function public._horse_run(_room_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  _winner int := floor(random()*6)::int + 1;
  _b record; _bal numeric; _payout numeric;
begin
  update public.horse_rooms set status='racing', started_at=now() where id=_room_id and status='waiting';
  if not found then return; end if;
  -- delay simbólico controlado pelo cliente; aqui já decidimos vencedor
  for _b in select * from public.horse_bets where room_id=_room_id loop
    if _b.horse = _winner then
      _payout := round(_b.bet * 5, 2);
      select amount into _bal from public.balances where user_id=_b.user_id for update;
      update public.balances set amount=round(_bal+_payout,2), updated_at=now() where user_id=_b.user_id;
      insert into public.history(user_id,type,game,amount,balance_after,note)
        values (_b.user_id,'win','Cavalos',_payout,round(_bal+_payout,2),'Cavalo '||_winner::text||' venceu');
      update public.horse_bets set win=_payout where room_id=_room_id and user_id=_b.user_id;
    end if;
  end loop;
  update public.horse_rooms set status='finished', winner=_winner, finished_at=now() where id=_room_id;
end;$$;

-- tick: usuário do cliente chama periodicamente; inicia salas em espera há > 30s com 2+ apostas
create or replace function public.horse_tick()
returns void language plpgsql security definer set search_path=public as $$
declare _r record;
begin
  for _r in
    select r.id from public.horse_rooms r
    where r.status='waiting'
      and r.created_at < now() - interval '30 seconds'
      and (select count(*) from public.horse_bets b where b.room_id=r.id) >= 2
  loop
    perform public._horse_run(_r.id);
  end loop;
  -- cancela salas com 1 ou 0 apostas após 60s (refund)
  for _r in
    select r.id from public.horse_rooms r
    where r.status='waiting'
      and r.created_at < now() - interval '60 seconds'
      and (select count(*) from public.horse_bets b where b.room_id=r.id) < 2
  loop
    perform public._horse_refund(_r.id);
  end loop;
end;$$;

create or replace function public._horse_refund(_room_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare _b record; _bal numeric;
begin
  update public.horse_rooms set status='finished', finished_at=now() where id=_room_id and status='waiting';
  if not found then return; end if;
  for _b in select * from public.horse_bets where room_id=_room_id loop
    select amount into _bal from public.balances where user_id=_b.user_id for update;
    update public.balances set amount=round(_bal+_b.bet,2), updated_at=now() where user_id=_b.user_id;
    insert into public.history(user_id,type,game,amount,balance_after,note)
      values (_b.user_id,'adjust','Cavalos',_b.bet,round(_bal+_b.bet,2),'Sala cancelada — reembolso');
  end loop;
end;$$;

-- =====================================================
-- 5) GUERRA DE CARTAS MULTIPLAYER (carta mais alta ganha o pote)
-- =====================================================
create table if not exists public.war_rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting',
  winning_card int,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create table if not exists public.war_bets (
  room_id uuid not null references public.war_rooms(id) on delete cascade,
  user_id uuid not null,
  user_email text,
  bet numeric not null,
  card int,
  win numeric not null default 0,
  joined_at timestamptz not null default now(),
  primary key(room_id, user_id)
);
alter table public.war_rooms enable row level security;
alter table public.war_bets enable row level security;
drop policy if exists "auth read war_rooms" on public.war_rooms;
create policy "auth read war_rooms" on public.war_rooms for select to authenticated using (true);
drop policy if exists "auth read war_bets" on public.war_bets;
create policy "auth read war_bets" on public.war_bets for select to authenticated using (true);

alter publication supabase_realtime add table public.war_rooms;
alter publication supabase_realtime add table public.war_bets;

create or replace function public.war_join(_bet numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  _uid uuid := auth.uid();
  _email text;
  _bal numeric; _new numeric;
  _room public.war_rooms%rowtype;
  _count int;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;
  select email into _email from public.profiles where id=_uid;

  select r.* into _room from public.war_rooms r
    where r.status='waiting'
      and not exists (select 1 from public.war_bets b where b.room_id=r.id and b.user_id=_uid)
      and (select count(*) from public.war_bets b where b.room_id=r.id) < 6
    order by r.created_at asc limit 1;
  if not found then
    insert into public.war_rooms default values returning * into _room;
  end if;

  select amount into _bal from public.balances where user_id=_uid for update;
  if coalesce(_bal,0) < _bet then raise exception 'insufficient_balance'; end if;
  _new := round(_bal - _bet, 2);
  update public.balances set amount=_new, updated_at=now() where user_id=_uid;
  insert into public.history(user_id,type,game,amount,balance_after,note)
    values (_uid,'bet','Guerra de Cartas',-_bet,_new,null);
  insert into public.war_bets(room_id,user_id,user_email,bet) values (_room.id,_uid,_email,_bet);

  select count(*) into _count from public.war_bets where room_id=_room.id;
  if _count >= 6 then
    perform public._war_run(_room.id);
  end if;

  return jsonb_build_object('room_id',_room.id,'balance',_new);
end;$$;

create or replace function public._war_run(_room_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  _b record; _max int := 0; _pot numeric := 0; _winners_cnt int := 0;
  _share numeric; _bal numeric; _payout numeric;
begin
  update public.war_rooms set status='racing', started_at=now() where id=_room_id and status='waiting';
  if not found then return; end if;
  -- distribui carta 1..13 a cada jogador
  for _b in select * from public.war_bets where room_id=_room_id loop
    update public.war_bets set card=floor(random()*13)::int + 1 where room_id=_room_id and user_id=_b.user_id;
  end loop;
  select max(card) into _max from public.war_bets where room_id=_room_id;
  select sum(bet) into _pot from public.war_bets where room_id=_room_id;
  -- aplica RTP: pote vira 90%
  _pot := round(_pot * 0.90, 2);
  select count(*) into _winners_cnt from public.war_bets where room_id=_room_id and card=_max;
  if _winners_cnt > 0 then
    _share := round(_pot / _winners_cnt, 2);
    for _b in select * from public.war_bets where room_id=_room_id and card=_max loop
      _payout := _share;
      select amount into _bal from public.balances where user_id=_b.user_id for update;
      update public.balances set amount=round(_bal+_payout,2), updated_at=now() where user_id=_b.user_id;
      insert into public.history(user_id,type,game,amount,balance_after,note)
        values (_b.user_id,'win','Guerra de Cartas',_payout,round(_bal+_payout,2),'Carta '||_max::text||' venceu');
      update public.war_bets set win=_payout where room_id=_room_id and user_id=_b.user_id;
    end loop;
  end if;
  update public.war_rooms set status='finished', winning_card=_max, finished_at=now() where id=_room_id;
end;$$;

create or replace function public._war_refund(_room_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare _b record; _bal numeric;
begin
  update public.war_rooms set status='finished', finished_at=now() where id=_room_id and status='waiting';
  if not found then return; end if;
  for _b in select * from public.war_bets where room_id=_room_id loop
    select amount into _bal from public.balances where user_id=_b.user_id for update;
    update public.balances set amount=round(_bal+_b.bet,2), updated_at=now() where user_id=_b.user_id;
    insert into public.history(user_id,type,game,amount,balance_after,note)
      values (_b.user_id,'adjust','Guerra de Cartas',_b.bet,round(_bal+_b.bet,2),'Sala cancelada — reembolso');
  end loop;
end;$$;

create or replace function public.war_tick()
returns void language plpgsql security definer set search_path=public as $$
declare _r record;
begin
  for _r in
    select r.id from public.war_rooms r
    where r.status='waiting'
      and r.created_at < now() - interval '30 seconds'
      and (select count(*) from public.war_bets b where b.room_id=r.id) >= 2
  loop
    perform public._war_run(_r.id);
  end loop;
  for _r in
    select r.id from public.war_rooms r
    where r.status='waiting'
      and r.created_at < now() - interval '60 seconds'
      and (select count(*) from public.war_bets b where b.room_id=r.id) < 2
  loop
    perform public._war_refund(_r.id);
  end loop;
end;$$;

-- =====================================================
-- 6) PIN admin no servidor
-- =====================================================
create table if not exists public.admin_pin (
  user_id uuid primary key,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_pin enable row level security;
-- nenhuma policy: acesso só via SECURITY DEFINER

create or replace function public.admin_pin_set(_pin text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _pin !~ '^[0-9]{4}$' then raise exception 'invalid_pin'; end if;
  insert into public.admin_pin(user_id,pin_hash)
    values (auth.uid(), encode(digest(_pin || auth.uid()::text, 'sha256'),'hex'))
  on conflict (user_id) do update set pin_hash=excluded.pin_hash, updated_at=now();
end;$$;

create or replace function public.admin_pin_is_set()
returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.admin_pin where user_id=auth.uid())
$$;

create or replace function public.admin_pin_verify(_pin text)
returns boolean language plpgsql security definer set search_path=public as $$
declare _h text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _pin !~ '^[0-9]{4}$' then return false; end if;
  select pin_hash into _h from public.admin_pin where user_id=auth.uid();
  if _h is null then return false; end if;
  return _h = encode(digest(_pin || auth.uid()::text, 'sha256'),'hex');
end;$$;

create or replace function public.admin_pin_clear()
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  delete from public.admin_pin where user_id=auth.uid();
end;$$;

-- =====================================================
-- 7) Anexo: só permite data: URL (anti-XSS)
-- =====================================================
alter table public.request_messages drop constraint if exists request_messages_attachment_data_url_check;
alter table public.request_messages add constraint request_messages_attachment_data_url_check
  check (
    attachment_data_url is null
    or (length(attachment_data_url) <= 2200000
        and attachment_data_url ~ '^data:[a-zA-Z0-9!#$&\-^_+./]+;base64,')
  );
