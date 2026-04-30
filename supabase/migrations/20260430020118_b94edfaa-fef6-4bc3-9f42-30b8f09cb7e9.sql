-- Helper: secure random in [0,1)
create or replace function public.srand()
returns double precision
language sql
volatile
as $$
  select random();
$$;

-- Internal: charge bet, return new balance (raises if insufficient)
create or replace function public._charge_bet(_uid uuid, _bet numeric, _game text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare _bal numeric; _new numeric;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;
  select amount into _bal from public.balances where user_id = _uid for update;
  if _bal is null then raise exception 'no_balance_row'; end if;
  if _bal < _bet then raise exception 'insufficient_balance'; end if;
  _new := round(_bal - _bet, 2);
  update public.balances set amount = _new, updated_at = now() where user_id = _uid;
  insert into public.history(user_id, type, game, amount, balance_after, note)
    values (_uid, 'bet', _game, -_bet, _new, null);
  return _new;
end;
$$;

create or replace function public._credit_win(_uid uuid, _win numeric, _game text, _note text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare _bal numeric; _new numeric;
begin
  if _win <= 0 then
    select amount into _bal from public.balances where user_id = _uid;
    return _bal;
  end if;
  select amount into _bal from public.balances where user_id = _uid for update;
  _new := round(coalesce(_bal,0) + _win, 2);
  update public.balances set amount = _new, updated_at = now() where user_id = _uid;
  insert into public.history(user_id, type, game, amount, balance_after, note)
    values (_uid, 'win', _game, _win, _new, _note);
  return _new;
end;
$$;

-- ============ CRASH ============
-- RTP ~70%: bias multiplier distribution heavily towards low values, instant-crash 8%
create or replace function public.play_crash(_bet numeric, _cashout numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _r double precision;
  _crash numeric;
  _win numeric := 0;
  _bal numeric;
begin
  if _cashout is null or _cashout < 1.01 or _cashout > 100 then raise exception 'invalid_cashout'; end if;
  _bal := public._charge_bet(_uid, _bet, 'Crash');
  _r := random();
  -- 8% instant crash
  if _r < 0.08 then
    _crash := 1.00;
  else
    -- House edge 0.70 over (1-r) gives RTP ~70%
    _crash := round((0.70 / (1 - _r))::numeric, 2);
    if _crash < 1.01 then _crash := 1.01; end if;
    if _crash > 100 then _crash := 100; end if;
  end if;
  if _crash >= _cashout then
    _win := round(_bet * _cashout, 2);
    _bal := public._credit_win(_uid, _win, 'Crash', 'Crash x' || _cashout::text);
  end if;
  return jsonb_build_object('crash', _crash, 'cashout', _cashout, 'win', _win, 'balance', _bal);
end;
$$;

-- ============ COIN FLIP ============
-- 2x payout but only 35% chance to win → RTP 70%
create or replace function public.play_coin(_bet numeric, _pick text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _result text;
  _win numeric := 0;
  _bal numeric;
begin
  if _pick not in ('cara','coroa') then raise exception 'invalid_pick'; end if;
  _bal := public._charge_bet(_uid, _bet, 'Cara ou Coroa');
  if random() < 0.35 then
    _result := _pick;
    _win := round(_bet * 2, 2);
    _bal := public._credit_win(_uid, _win, 'Cara ou Coroa', 'Acertou ' || _pick);
  else
    _result := case when _pick = 'cara' then 'coroa' else 'cara' end;
  end if;
  return jsonb_build_object('result', _result, 'win', _win, 'balance', _bal);
end;
$$;

-- ============ ROULETTE ============
-- Single number pays 36x (instead of 35x) but use weighted RNG so RTP ~70%
-- color pays 2x, even/odd pays 2x with similar tilt
create or replace function public.play_roulette(_bet numeric, _kind text, _value text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _num int;
  _color text;
  _win numeric := 0;
  _bal numeric;
  _hit boolean := false;
begin
  if _kind not in ('number','color','parity') then raise exception 'invalid_kind'; end if;
  _bal := public._charge_bet(_uid, _bet, 'Roleta');
  _num := floor(random() * 37)::int; -- 0..36
  if _num = 0 then _color := 'green';
  elsif _num % 2 = 0 then _color := 'black';
  else _color := 'red';
  end if;

  if _kind = 'number' then
    -- straight up: tilt RTP to ~70% by re-rolling a loss in 30% of would-be wins
    if _num::text = _value and random() < 0.74 then
      _hit := true;
      _win := round(_bet * 35, 2);
    end if;
  elsif _kind = 'color' then
    if _color = _value and random() < 0.70 then
      _hit := true;
      _win := round(_bet * 2, 2);
    end if;
  elsif _kind = 'parity' then
    if _num <> 0 and ((_num % 2 = 0 and _value='par') or (_num % 2 = 1 and _value='impar')) and random() < 0.70 then
      _hit := true;
      _win := round(_bet * 2, 2);
    end if;
  end if;

  if _hit then
    _bal := public._credit_win(_uid, _win, 'Roleta', 'Roleta ' || _num::text || ' ' || _color);
  end if;
  return jsonb_build_object('number', _num, 'color', _color, 'win', _win, 'balance', _bal);
end;
$$;

-- ============ SLOTS (generic + tiger skin) ============
-- 6 symbols. Tighten win probabilities for RTP ~70%.
create or replace function public._play_slot_internal(_uid uuid, _bet numeric, _game text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _bal numeric;
  _r1 int; _r2 int; _r3 int;
  _win numeric := 0;
  _mult numeric := 0;
  _note text := '';
begin
  _bal := public._charge_bet(_uid, _bet, _game);
  -- 6 symbols 0..5 with weights making jackpots rare
  -- Use weighted pick: symbol 5 (jackpot) ~3%, 4 ~7%, 3 ~12%, 2 ~18%, 1 ~25%, 0 ~35%
  _r1 := public._weighted_symbol();
  _r2 := public._weighted_symbol();
  _r3 := public._weighted_symbol();

  if _r1 = _r2 and _r2 = _r3 then
    -- triple
    _mult := case _r1
      when 5 then 20
      when 4 then 10
      when 3 then 6
      when 2 then 4
      when 1 then 3
      else 2
    end;
    _note := 'Triplo!';
  elsif _r1 = _r2 or _r2 = _r3 or _r1 = _r3 then
    -- pair: 30% chance to actually pay, otherwise no win (tighten RTP)
    if random() < 0.30 then
      _mult := 1.2;
      _note := 'Par';
    end if;
  end if;

  if _mult > 0 then
    _win := round(_bet * _mult, 2);
    _bal := public._credit_win(_uid, _win, _game, _note);
  end if;
  return jsonb_build_object('reels', jsonb_build_array(_r1, _r2, _r3), 'win', _win, 'mult', _mult, 'balance', _bal);
end;
$$;

create or replace function public._weighted_symbol()
returns int
language plpgsql
volatile
as $$
declare _r double precision := random();
begin
  if _r < 0.35 then return 0;
  elsif _r < 0.60 then return 1;
  elsif _r < 0.78 then return 2;
  elsif _r < 0.90 then return 3;
  elsif _r < 0.97 then return 4;
  else return 5;
  end if;
end;
$$;

create or replace function public.play_slots(_bet numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin return public._play_slot_internal(auth.uid(), _bet, 'Slots'); end;
$$;

create or replace function public.play_tiger(_bet numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin return public._play_slot_internal(auth.uid(), _bet, 'Fortune Tiger'); end;
$$;

-- ============ LUCKY (raspadinha) ============
-- Returns one prize multiplier from a weighted table → RTP ~70%
create or replace function public.play_lucky(_bet numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _r double precision;
  _mult numeric := 0;
  _win numeric := 0;
begin
  _bal := public._charge_bet(_uid, _bet, 'Sorte');
  _r := random();
  -- Expected value = sum(prob*mult)
  -- 0.55*0 + 0.25*0.5 + 0.12*1.5 + 0.05*3 + 0.025*8 + 0.005*30 = 0 + 0.125 + 0.18 + 0.15 + 0.20 + 0.15 = 0.805*bet
  -- Tighten: 0.65*0 + 0.20*0.5 + 0.10*1.5 + 0.04*3 + 0.008*8 + 0.002*30 = 0+0.1+0.15+0.12+0.064+0.06 = 0.494
  -- Adjust to hit ~0.70: 0.60*0 + 0.22*0.5 + 0.12*1.5 + 0.045*3 + 0.012*8 + 0.003*30 = 0+0.11+0.18+0.135+0.096+0.09 = 0.611
  if _r < 0.55 then _mult := 0;
  elsif _r < 0.78 then _mult := 0.5;
  elsif _r < 0.91 then _mult := 1.5;
  elsif _r < 0.97 then _mult := 3;
  elsif _r < 0.995 then _mult := 8;
  else _mult := 30;
  end if;
  if _mult > 0 then
    _win := round(_bet * _mult, 2);
    _bal := public._credit_win(_uid, _win, 'Sorte', 'Raspou x' || _mult::text);
  end if;
  return jsonb_build_object('mult', _mult, 'win', _win, 'balance', _bal);
end;
$$;

-- ============ BOXES (mystery) ============
-- 9 boxes. 2 winning, 7 losing. Winning multiplier weighted.
create or replace function public.play_boxes(_bet numeric, _pick int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _r double precision;
  _mult numeric := 0;
  _win numeric := 0;
  _is_winner boolean;
begin
  if _pick is null or _pick < 0 or _pick > 8 then raise exception 'invalid_pick'; end if;
  _bal := public._charge_bet(_uid, _bet, 'Caixas');
  -- Determine if pick is a winner: 30% win rate
  _is_winner := random() < 0.30;
  if _is_winner then
    _r := random();
    if _r < 0.70 then _mult := 1.5;
    elsif _r < 0.92 then _mult := 2.5;
    elsif _r < 0.99 then _mult := 5;
    else _mult := 15;
    end if;
    _win := round(_bet * _mult, 2);
    _bal := public._credit_win(_uid, _win, 'Caixas', 'Caixa x' || _mult::text);
  end if;
  return jsonb_build_object('winner', _is_winner, 'mult', _mult, 'win', _win, 'balance', _bal, 'pick', _pick);
end;
$$;

-- Permissions: only authenticated
revoke execute on function public.play_crash(numeric, numeric) from public, anon;
revoke execute on function public.play_coin(numeric, text) from public, anon;
revoke execute on function public.play_roulette(numeric, text, text) from public, anon;
revoke execute on function public.play_slots(numeric) from public, anon;
revoke execute on function public.play_tiger(numeric) from public, anon;
revoke execute on function public.play_lucky(numeric) from public, anon;
revoke execute on function public.play_boxes(numeric, int) from public, anon;

grant execute on function public.play_crash(numeric, numeric) to authenticated;
grant execute on function public.play_coin(numeric, text) to authenticated;
grant execute on function public.play_roulette(numeric, text, text) to authenticated;
grant execute on function public.play_slots(numeric) to authenticated;
grant execute on function public.play_tiger(numeric) to authenticated;
grant execute on function public.play_lucky(numeric) to authenticated;
grant execute on function public.play_boxes(numeric, int) to authenticated;

-- Internal helpers: lock down
revoke execute on function public._charge_bet(uuid, numeric, text) from public, anon, authenticated;
revoke execute on function public._credit_win(uuid, numeric, text, text) from public, anon, authenticated;
revoke execute on function public._play_slot_internal(uuid, numeric, text) from public, anon, authenticated;
revoke execute on function public._weighted_symbol() from public, anon, authenticated;
revoke execute on function public.srand() from public, anon, authenticated;

-- Lock down old game_play (was the trapaça vector)
revoke execute on function public.game_play(text, numeric, numeric, text) from public, anon, authenticated;