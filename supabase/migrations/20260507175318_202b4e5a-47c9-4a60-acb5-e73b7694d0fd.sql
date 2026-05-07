create or replace function public._horse_run(_room_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _winner int := floor(random()*6)::int + 1;
  _b record; _bal numeric; _payout numeric;
  _pot numeric := 0; _prize_pool numeric := 0; _winners_cnt int := 0; _share numeric := 0;
begin
  update public.horse_rooms set status='racing', started_at=now() where id=_room_id and status='waiting';
  if not found then return; end if;

  select coalesce(sum(bet),0) into _pot from public.horse_bets where room_id=_room_id;
  _prize_pool := round(_pot * 0.65, 2);
  select count(*) into _winners_cnt from public.horse_bets where room_id=_room_id and horse=_winner;

  if _winners_cnt > 0 then
    _share := round(_prize_pool / _winners_cnt, 2);
    for _b in select * from public.horse_bets where room_id=_room_id and horse=_winner loop
      _payout := _share;
      select amount into _bal from public.balances where user_id=_b.user_id for update;
      update public.balances set amount=round(_bal+_payout,2), updated_at=now() where user_id=_b.user_id;
      insert into public.history(user_id,type,game,amount,balance_after,note)
        values (_b.user_id,'win','Cavalos',_payout,round(_bal+_payout,2),'Cavalo '||_winner::text||' venceu (65% do pote)');
      update public.horse_bets set win=_payout where room_id=_room_id and user_id=_b.user_id;
    end loop;
  end if;

  update public.horse_rooms set status='finished', winner=_winner, finished_at=now() where id=_room_id;
end;$function$;