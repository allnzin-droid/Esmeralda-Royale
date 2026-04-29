
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.request_owner(text, uuid) from anon, authenticated;
revoke execute on function public.game_play(text, numeric, numeric, text) from anon;
revoke execute on function public.admin_resolve_deposit(uuid, boolean) from anon;
revoke execute on function public.admin_resolve_withdraw(uuid, boolean) from anon;
revoke execute on function public.admin_adjust_balance(uuid, numeric, text) from anon;
revoke execute on function public.admin_set_deposit_pix(uuid, text) from anon;
revoke execute on function public.admin_list_users() from anon;
