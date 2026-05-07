
CREATE OR REPLACE FUNCTION public.admin_pin_set(_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _pin !~ '^[0-9]{4}$' then raise exception 'invalid_pin'; end if;
  insert into public.admin_pin(user_id,pin_hash)
    values (auth.uid(), encode(extensions.digest(_pin || auth.uid()::text, 'sha256'),'hex'))
  on conflict (user_id) do update set pin_hash=excluded.pin_hash, updated_at=now();
end;$function$;

CREATE OR REPLACE FUNCTION public.admin_pin_verify(_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare _h text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _pin !~ '^[0-9]{4}$' then return false; end if;
  select pin_hash into _h from public.admin_pin where user_id=auth.uid();
  if _h is null then return false; end if;
  return _h = encode(extensions.digest(_pin || auth.uid()::text, 'sha256'),'hex');
end;$function$;
