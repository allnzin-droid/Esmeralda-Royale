
-- 1) Roleta com cores oficiais
CREATE OR REPLACE FUNCTION public.play_roulette(_bet numeric, _kind text, _value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _num int; _color text;
  _win numeric := 0; _bal numeric;
  _hit boolean := false;
  _reds int[] := ARRAY[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
begin
  if _kind not in ('number','color','parity') then raise exception 'invalid_kind'; end if;
  _bal := public._charge_bet(_uid, _bet, 'Roleta');
  _num := floor(random() * 37)::int;
  if _num = 0 then _color := 'green';
  elsif _num = ANY(_reds) then _color := 'red';
  else _color := 'black';
  end if;
  if _kind = 'number' then
    if _num::text = _value then _hit := true; _win := round(_bet * 35, 2); end if;
  elsif _kind = 'color' then
    if _color = _value then _hit := true; _win := round(_bet * 2, 2); end if;
  elsif _kind = 'parity' then
    if _num <> 0 and ((_num % 2 = 0 and _value='par') or (_num % 2 = 1 and _value='impar')) then
      _hit := true; _win := round(_bet * 2, 2);
    end if;
  end if;
  if _hit then
    _bal := public._credit_win(_uid, _win, 'Roleta', 'Roleta ' || _num::text || ' ' || _color);
  end if;
  return jsonb_build_object('number', _num, 'color', _color, 'win', _win, 'balance', _bal);
end;$function$;

-- 2) Caixas Premiadas: 9 caixas (3x3)
CREATE OR REPLACE FUNCTION public.boxes_start(_bet numeric, _target integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  for _i in 1..9 loop
    _r := random();
    if _r < 0.40 then _m := -1;
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
end;$function$;

CREATE OR REPLACE FUNCTION public.boxes_pick(_round_id uuid, _index integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if _index < 0 or _index > 8 then raise exception 'invalid_index'; end if;
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
end;$function$;

-- 3) Cavalos: cavalo único por sala
CREATE OR REPLACE FUNCTION public.horse_join(_bet numeric, _horse integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Procura sala em espera onde user ainda não entrou E onde o cavalo ainda está livre
  select r.* into _room from public.horse_rooms r
    where r.status='waiting'
      and not exists (select 1 from public.horse_bets b where b.room_id=r.id and b.user_id=_uid)
      and not exists (select 1 from public.horse_bets b where b.room_id=r.id and b.horse=_horse)
      and (select count(*) from public.horse_bets b where b.room_id=r.id) < 6
    order by r.created_at asc limit 1;
  if not found then
    insert into public.horse_rooms default values returning * into _room;
  end if;

  -- proteção dupla contra corrida: re-checa cavalo
  if exists (select 1 from public.horse_bets b where b.room_id=_room.id and b.horse=_horse) then
    raise exception 'horse_taken';
  end if;

  select amount into _bal from public.balances where user_id=_uid for update;
  if coalesce(_bal,0) < _bet then raise exception 'insufficient_balance'; end if;
  _new := round(_bal - _bet, 2);
  update public.balances set amount=_new, updated_at=now() where user_id=_uid;
  insert into public.history(user_id,type,game,amount,balance_after,note)
    values (_uid,'bet','Cavalos',-_bet,_new,'Cavalo '||_horse::text);
  insert into public.horse_bets(room_id,user_id,user_email,horse,bet) values (_room.id,_uid,_email,_horse,_bet);

  select count(*) into _count from public.horse_bets where room_id=_room.id;
  if _count >= 6 then
    perform public._horse_run(_room.id);
  end if;

  return jsonb_build_object('room_id',_room.id,'balance',_new);
end;$function$;

-- Índice único garantindo unicidade do cavalo por sala
CREATE UNIQUE INDEX IF NOT EXISTS uq_horse_per_room ON public.horse_bets(room_id, horse);
