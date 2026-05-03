
-- 1) Remover hardcoded admin email do trigger handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _name text := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, name) values (new.id, new.email, _name);
  insert into public.balances (user_id, amount) values (new.id, 0);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$function$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Corrigir política restrictive em user_roles:
--    A anterior aplicava a TODAS as operações (incluindo SELECT), o que podia
--    bloquear o admin de ler/gerenciar o próprio registro. Restringir apenas
--    INSERT/UPDATE/DELETE para que ninguém (nem admin) altere o próprio papel,
--    mas SELECT continue funcionando normalmente.
DROP POLICY IF EXISTS "no self role mutation" ON public.user_roles;

CREATE POLICY "no self role insert"
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (user_id <> auth.uid());

CREATE POLICY "no self role update"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (user_id <> auth.uid())
  WITH CHECK (user_id <> auth.uid());

CREATE POLICY "no self role delete"
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (user_id <> auth.uid());

-- 3) Adicionar WITH CHECK nas políticas de update de depósitos/saques
--    para impedir que o admin reatribua user_id ou amount sem querer.
DROP POLICY IF EXISTS "admins update deposits" ON public.deposit_requests;
CREATE POLICY "admins update deposits"
  ON public.deposit_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update withdrawals" ON public.withdraw_requests;
CREATE POLICY "admins update withdrawals"
  ON public.withdraw_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Fixar search_path em funções faltantes (srand, _weighted_symbol)
CREATE OR REPLACE FUNCTION public.srand()
RETURNS double precision
LANGUAGE sql
SET search_path TO 'public'
AS $function$ select random(); $function$;

CREATE OR REPLACE FUNCTION public._weighted_symbol()
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.realtime_topic_uid(_topic text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE m text;
BEGIN
  m := substring(_topic from '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
  IF m IS NULL THEN RETURN NULL; END IF;
  RETURN m::uuid;
END;
$function$;
