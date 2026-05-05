
-- 1. Padronizar nomes para histórico
CREATE OR REPLACE FUNCTION public.play_tiger(_bet numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _grid int[]; _r int;
  _lines int[][] := ARRAY[ARRAY[0,1,2], ARRAY[3,4,5], ARRAY[6,7,8], ARRAY[0,4,8], ARRAY[2,4,6]];
  _line int[]; _wins jsonb := '[]'::jsonb;
  _mult_total numeric := 0; _line_mult numeric;
  _win numeric := 0;
  _hit_lines int[] := ARRAY[]::int[];
  _i int := 0;
begin
  _bal := public._charge_bet(_uid, _bet, 'Fortune Tiger');
  _grid := ARRAY[]::int[];
  for _r in 1..9 loop
    _grid := _grid || public._weighted_symbol();
  end loop;
  foreach _line slice 1 in array _lines loop
    if _grid[_line[1]+1] = _grid[_line[2]+1] and _grid[_line[2]+1] = _grid[_line[3]+1] then
      _line_mult := case _grid[_line[1]+1]
        when 5 then 15 when 4 then 8 when 3 then 5 when 2 then 3 when 1 then 2 else 1.5 end;
      -- Apenas 60% das vitórias linha pagam (apertando RTP)
      if random() < 0.60 then
        _mult_total := _mult_total + _line_mult;
        _hit_lines := _hit_lines || _i;
      end if;
    end if;
    _i := _i + 1;
  end loop;
  if _mult_total > 0 then
    _win := round(_bet * _mult_total, 2);
    _bal := public._credit_win(_uid, _win, 'Fortune Tiger', 'Linhas: ' || array_length(_hit_lines,1)::text);
  end if;
  return jsonb_build_object('grid', to_jsonb(_grid), 'lines', to_jsonb(_hit_lines), 'mult', _mult_total, 'win', _win, 'balance', _bal);
end;
$function$;

CREATE OR REPLACE FUNCTION public.play_slots(_bet numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _grid int[]; _r int;
  _lines int[][] := ARRAY[ARRAY[0,1,2], ARRAY[3,4,5], ARRAY[6,7,8], ARRAY[0,4,8], ARRAY[2,4,6]];
  _line int[]; _mult_total numeric := 0; _line_mult numeric;
  _win numeric := 0;
  _hit_lines int[] := ARRAY[]::int[];
  _i int := 0;
begin
  _bal := public._charge_bet(_uid, _bet, 'Caça-Níqueis');
  _grid := ARRAY[]::int[];
  for _r in 1..9 loop
    _grid := _grid || public._weighted_symbol();
  end loop;
  foreach _line slice 1 in array _lines loop
    if _grid[_line[1]+1] = _grid[_line[2]+1] and _grid[_line[2]+1] = _grid[_line[3]+1] then
      _line_mult := case _grid[_line[1]+1]
        when 5 then 15 when 4 then 8 when 3 then 5 when 2 then 3 when 1 then 2 else 1.5 end;
      if random() < 0.60 then
        _mult_total := _mult_total + _line_mult;
        _hit_lines := _hit_lines || _i;
      end if;
    end if;
    _i := _i + 1;
  end loop;
  if _mult_total > 0 then
    _win := round(_bet * _mult_total, 2);
    _bal := public._credit_win(_uid, _win, 'Caça-Níqueis', 'Linhas: ' || array_length(_hit_lines,1)::text);
  end if;
  return jsonb_build_object('grid', to_jsonb(_grid), 'lines', to_jsonb(_hit_lines), 'mult', _mult_total, 'win', _win, 'balance', _bal);
end;
$function$;

-- Símbolos ainda mais raros
CREATE OR REPLACE FUNCTION public._weighted_symbol()
 RETURNS integer LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
declare _r double precision := random();
begin
  if _r < 0.45 then return 0;
  elsif _r < 0.70 then return 1;
  elsif _r < 0.85 then return 2;
  elsif _r < 0.94 then return 3;
  elsif _r < 0.985 then return 4;
  else return 5;
  end if;
end;
$function$;

-- 2. Roleta par/ímpar 1x (lucro líquido = 0, payout 1x)
-- Convenção: payout 1x significa devolve a aposta + 1x o valor = 2x. Mas usuário pediu "par e impar mude para 1x"
-- Interpretando como "lucro 1x = retorno 2x" → mantém. Mais provável: ele quer cor/par-ímpar = paga só de volta a aposta = não vale jogar.
-- Decisão: par/ímpar paga 1x retorno (= 0 lucro, devolve a aposta). Cor 2x continua. Número 35x continua.
CREATE OR REPLACE FUNCTION public.play_roulette(_bet numeric, _kind text, _value text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    if _num::text = _value and random() < 0.55 then
      _hit := true; _win := round(_bet * 35, 2);
    end if;
  elsif _kind = 'color' then
    if _color = _value and random() < 0.55 then
      _hit := true; _win := round(_bet * 2, 2);
    end if;
  elsif _kind = 'parity' then
    if _num <> 0 and ((_num % 2 = 0 and _value='par') or (_num % 2 = 1 and _value='impar')) and random() < 0.50 then
      _hit := true; _win := round(_bet * 1, 2); -- paga 1x = devolve aposta
    end if;
  end if;
  if _hit then
    _bal := public._credit_win(_uid, _win, 'Roleta', 'Roleta ' || _num::text || ' ' || _color);
  end if;
  return jsonb_build_object('number', _num, 'color', _color, 'win', _win, 'balance', _bal);
end;
$function$;

-- 3. Raspadinha — só renomear para o histórico aparecer
CREATE OR REPLACE FUNCTION public.play_lucky(_bet numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _r double precision; _mult numeric := 0; _win numeric := 0;
begin
  _bal := public._charge_bet(_uid, _bet, 'Raspadinha');
  _r := random();
  if _r < 0.70 then _mult := 0;
  elsif _r < 0.88 then _mult := 0.5;
  elsif _r < 0.96 then _mult := 1.5;
  elsif _r < 0.99 then _mult := 3;
  elsif _r < 0.997 then _mult := 8;
  else _mult := 30;
  end if;
  if _mult > 0 then
    _win := round(_bet * _mult, 2);
    _bal := public._credit_win(_uid, _win, 'Raspadinha', 'Raspou x' || _mult::text);
  end if;
  return jsonb_build_object('mult', _mult, 'win', _win, 'balance', _bal);
end;
$function$;

-- 4. Cara/Coroa — mais raro
CREATE OR REPLACE FUNCTION public.play_coin(_bet numeric, _pick text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _result text; _win numeric := 0; _bal numeric;
begin
  if _pick not in ('cara','coroa') then raise exception 'invalid_pick'; end if;
  _bal := public._charge_bet(_uid, _bet, 'Cara ou Coroa');
  if random() < 0.25 then
    _result := _pick;
    _win := round(_bet * 2, 2);
    _bal := public._credit_win(_uid, _win, 'Cara ou Coroa', 'Acertou ' || _pick);
  else
    _result := case when _pick = 'cara' then 'coroa' else 'cara' end;
  end if;
  return jsonb_build_object('result', _result, 'win', _win, 'balance', _bal);
end;
$function$;

-- 5. Caixas Premiadas — nova regra. Abre N caixas (1-3, max = floor(saldo/bet)), se qualquer X = perde tudo.
DROP FUNCTION IF EXISTS public.play_boxes(numeric, integer);
CREATE OR REPLACE FUNCTION public.play_boxes(_bet numeric, _count integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _bal numeric; _new numeric;
  _i int; _r double precision; _m numeric;
  _picks jsonb := '[]'::jsonb;
  _has_x boolean := false;
  _total_mult numeric := 0;
  _total_win numeric := 0;
  _total_bet numeric;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _count is null or _count < 1 or _count > 3 then raise exception 'invalid_count'; end if;
  if _bet is null or _bet <= 0 then raise exception 'invalid_bet'; end if;
  _total_bet := _bet * _count;
  -- carrega/charge
  select amount into _bal from public.balances where user_id = _uid for update;
  if coalesce(_bal,0) < _total_bet then raise exception 'insufficient_balance'; end if;
  _new := round(_bal - _total_bet, 2);
  update public.balances set amount = _new, updated_at = now() where user_id = _uid;
  insert into public.history(user_id, type, game, amount, balance_after, note)
    values (_uid, 'bet', 'Caixas Premiadas', -_total_bet, _new, _count::text || ' caixas');

  -- abre N caixas
  for _i in 1.._count loop
    _r := random();
    if _r < 0.30 then
      _m := 0; -- X = perde tudo
      _has_x := true;
    elsif _r < 0.70 then
      _m := 1.2;
    elsif _r < 0.88 then
      _m := 1.8;
    elsif _r < 0.97 then
      _m := 3;
    else
      _m := 8;
    end if;
    _picks := _picks || jsonb_build_object('mult', _m, 'is_x', _m = 0);
    if not _has_x then _total_mult := _total_mult + _m; end if;
  end loop;

  if not _has_x and _total_mult > 0 then
    _total_win := round(_bet * _total_mult, 2);
    _new := round(_new + _total_win, 2);
    update public.balances set amount = _new, updated_at = now() where user_id = _uid;
    insert into public.history(user_id, type, game, amount, balance_after, note)
      values (_uid, 'win', 'Caixas Premiadas', _total_win, _new, 'Total x' || _total_mult::text);
  end if;

  return jsonb_build_object(
    'picks', _picks,
    'has_x', _has_x,
    'total_mult', _total_mult,
    'win', _total_win,
    'balance', _new
  );
end;
$function$;

-- 6. Crash — cash-out manual real. Mesa de rodadas ativas.
CREATE TABLE IF NOT EXISTS public.crash_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bet numeric NOT NULL,
  crash_point numeric NOT NULL,
  cashed_at numeric,
  win numeric NOT NULL DEFAULT 0,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own crash" ON public.crash_rounds;
CREATE POLICY "users read own crash" ON public.crash_rounds FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP FUNCTION IF EXISTS public.play_crash(numeric, numeric);
CREATE OR REPLACE FUNCTION public.crash_start(_bet numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _r double precision := random();
  _crash numeric;
  _id uuid;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;
  select amount into _bal from public.balances where user_id = _uid for update;
  if coalesce(_bal,0) < _bet then raise exception 'insufficient_balance'; end if;
  update public.balances set amount = round(_bal - _bet,2), updated_at = now() where user_id = _uid;
  insert into public.history(user_id, type, game, amount, balance_after, note)
    values (_uid, 'bet', 'Crash', -_bet, round(_bal - _bet,2), null);
  if _r < 0.15 then _crash := 1.00;
  else
    _crash := round((0.65 / (1 - _r))::numeric, 2);
    if _crash < 1.01 then _crash := 1.01; end if;
    if _crash > 100 then _crash := 100; end if;
  end if;
  insert into public.crash_rounds(user_id, bet, crash_point) values (_uid, _bet, _crash) returning id into _id;
  return jsonb_build_object('round_id', _id, 'balance', round(_bal - _bet,2));
end;
$function$;

CREATE OR REPLACE FUNCTION public.crash_cashout(_round_id uuid, _at_mult numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _r public.crash_rounds%rowtype;
  _bal numeric;
  _win numeric := 0;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  select * into _r from public.crash_rounds where id = _round_id and user_id = _uid for update;
  if not found then raise exception 'not_found'; end if;
  if _r.resolved then raise exception 'already_resolved'; end if;
  if _at_mult is null or _at_mult < 1.01 then raise exception 'invalid_cashout'; end if;
  if _at_mult <= _r.crash_point then
    _win := round(_r.bet * _at_mult, 2);
    select amount into _bal from public.balances where user_id = _uid for update;
    update public.balances set amount = round(_bal + _win,2), updated_at = now() where user_id = _uid;
    insert into public.history(user_id, type, game, amount, balance_after, note)
      values (_uid, 'win', 'Crash', _win, round(_bal + _win,2), 'Sacou em x' || _at_mult::text);
    update public.crash_rounds set resolved = true, resolved_at = now(), cashed_at = _at_mult, win = _win where id = _round_id;
    select amount into _bal from public.balances where user_id = _uid;
    return jsonb_build_object('ok', true, 'crash_point', _r.crash_point, 'win', _win, 'balance', _bal);
  else
    update public.crash_rounds set resolved = true, resolved_at = now() where id = _round_id;
    select amount into _bal from public.balances where user_id = _uid;
    return jsonb_build_object('ok', false, 'crash_point', _r.crash_point, 'win', 0, 'balance', _bal);
  end if;
end;
$function$;

-- Resolve rodada se usuário não sacar (chamado quando crash visualiza)
CREATE OR REPLACE FUNCTION public.crash_reveal(_round_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid();
  _r public.crash_rounds%rowtype;
begin
  select * into _r from public.crash_rounds where id = _round_id and user_id = _uid for update;
  if not found then raise exception 'not_found'; end if;
  if not _r.resolved then
    update public.crash_rounds set resolved = true, resolved_at = now() where id = _round_id;
  end if;
  return jsonb_build_object('crash_point', _r.crash_point);
end;
$function$;
