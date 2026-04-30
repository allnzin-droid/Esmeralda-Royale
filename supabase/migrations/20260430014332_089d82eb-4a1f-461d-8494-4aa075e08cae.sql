-- 1) Realtime RLS: restringir tópicos por usuário
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Helper: extrai o user_id do final do nome do canal (formato "<prefix>-<uuid>")
CREATE OR REPLACE FUNCTION public.realtime_topic_uid(_topic text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(_topic, '-', array_length(string_to_array(_topic, '-'), 1) - 4
    -- fallback: pega últimos 5 segmentos juntos como uuid
  ), '')::uuid
$$;

-- Substitui por uma versão mais simples e robusta usando regex
CREATE OR REPLACE FUNCTION public.realtime_topic_uid(_topic text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m text;
BEGIN
  m := substring(_topic from '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
  IF m IS NULL THEN RETURN NULL; END IF;
  RETURN m::uuid;
END;
$$;

DROP POLICY IF EXISTS "users subscribe own realtime topics" ON realtime.messages;
CREATE POLICY "users subscribe own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.realtime_topic_uid((realtime.topic())) = auth.uid()
);

-- 2) Defesa em profundidade em user_roles: ninguém (nem admin) pode se auto-promover
DROP POLICY IF EXISTS "no self role mutation" ON public.user_roles;
CREATE POLICY "no self role mutation"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (user_id <> auth.uid())
WITH CHECK (user_id <> auth.uid());

-- 3) Imutabilidade explícita das mensagens de pedidos
DROP POLICY IF EXISTS "request messages are immutable (update)" ON public.request_messages;
CREATE POLICY "request messages are immutable (update)"
ON public.request_messages
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "request messages are immutable (delete)" ON public.request_messages;
CREATE POLICY "request messages are immutable (delete)"
ON public.request_messages
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);