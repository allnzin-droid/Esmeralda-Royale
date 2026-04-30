-- Lockdown EXECUTE on SECURITY DEFINER functions
revoke execute on function public.admin_resolve_deposit(uuid, boolean) from anon, public;
revoke execute on function public.admin_resolve_withdraw(uuid, boolean) from anon, public;
revoke execute on function public.admin_adjust_balance(uuid, numeric, text) from anon, public;
revoke execute on function public.admin_set_deposit_pix(uuid, text) from anon, public;
revoke execute on function public.admin_list_users() from anon, public;
revoke execute on function public.game_play(text, numeric, numeric, text) from anon, public;

grant execute on function public.admin_resolve_deposit(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_withdraw(uuid, boolean) to authenticated;
grant execute on function public.admin_adjust_balance(uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_deposit_pix(uuid, text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.game_play(text, numeric, numeric, text) to authenticated;