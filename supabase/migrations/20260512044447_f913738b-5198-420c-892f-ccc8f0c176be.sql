-- 1) Remove função insegura game_play (permitia win arbitrário)
DROP FUNCTION IF EXISTS public.game_play(text, numeric, numeric, text);

-- 2) Remove user_email das tabelas de apostas (PII exposta)
ALTER TABLE public.horse_bets DROP COLUMN IF EXISTS user_email;
ALTER TABLE public.war_bets DROP COLUMN IF EXISTS user_email;

-- 3) Atualiza RPCs para não inserir user_email
CREATE OR REPLACE FUNCTION public.horse_join(_bet numeric, _horse integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _bal numeric; _new numeric;
  _room public.horse_rooms%rowtype;
  _count int;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;
  if _horse < 1 or _horse > 6 then raise exception 'invalid_horse'; end if;

  select r.* into _room from public.horse_rooms r
    where r.status='waiting'
      and not exists (select 1 from public.horse_bets b where b.room_id=r.id and b.user_id=_uid)
      and not exists (select 1 from public.horse_bets b where b.room_id=r.id and b.horse=_horse)
      and (select count(*) from public.horse_bets b where b.room_id=r.id) < 6
    order by r.created_at asc limit 1;
  if not found then
    insert into public.horse_rooms default values returning * into _room;
  end if;

  if exists (select 1 from public.horse_bets b where b.room_id=_room.id and b.horse=_horse) then
    raise exception 'horse_taken';
  end if;

  select amount into _bal from public.balances where user_id=_uid for update;
  if coalesce(_bal,0) < _bet then raise exception 'insufficient_balance'; end if;
  _new := round(_bal - _bet, 2);
  update public.balances set amount=_new, updated_at=now() where user_id=_uid;
  insert into public.history(user_id,type,game,amount,balance_after,note)
    values (_uid,'bet','Cavalos',-_bet,_new,'Cavalo '||_horse::text);
  insert into public.horse_bets(room_id,user_id,horse,bet) values (_room.id,_uid,_horse,_bet);

  select count(*) into _count from public.horse_bets where room_id=_room.id;
  if _count >= 6 then
    perform public._horse_run(_room.id);
  end if;

  return jsonb_build_object('room_id',_room.id,'balance',_new);
end;$function$;

CREATE OR REPLACE FUNCTION public.war_join(_bet numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _bal numeric; _new numeric;
  _room public.war_rooms%rowtype;
  _count int;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;

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
  insert into public.war_bets(room_id,user_id,bet) values (_room.id,_uid,_bet);

  select count(*) into _count from public.war_bets where room_id=_room.id;
  if _count >= 6 then
    perform public._war_run(_room.id);
  end if;

  return jsonb_build_object('room_id',_room.id,'balance',_new);
end;$function$;