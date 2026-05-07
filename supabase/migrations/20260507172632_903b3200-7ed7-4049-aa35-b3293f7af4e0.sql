
REVOKE ALL ON FUNCTION public.admin_pin_set(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_pin_verify(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_pin_clear() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_pin_is_set() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_pin_set(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pin_verify(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pin_clear() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pin_is_set() TO authenticated;
