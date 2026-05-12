-- Remove tabelas sensíveis da publicação realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.balances;
ALTER PUBLICATION supabase_realtime DROP TABLE public.history;
ALTER PUBLICATION supabase_realtime DROP TABLE public.deposit_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.withdraw_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.request_messages;

-- Reforça handle_new_user (garante que não há atribuição automática de admin via e-mail)
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

-- Garante RLS + policy mínima em admin_pin (era RLS sem policy)
ALTER TABLE public.admin_pin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own admin_pin" ON public.admin_pin;
CREATE POLICY "users manage own admin_pin" ON public.admin_pin
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(),'admin'));