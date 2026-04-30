## Objetivo

1. Garantir fluxo de redirecionamento confiável após login Google (já quase pronto, pequenos ajustes de UX).
2. Corrigir o aviso de segurança: funções `SECURITY DEFINER` executáveis por `anon` / `authenticated` sem necessidade.

---

## Parte 1 — Fluxo Google → Dashboard

O fluxo atual já funciona: `lovable.auth.signInWithOAuth("google")` define a sessão via `supabase.auth.setSession`, o listener `onAuthStateChange` em `src/lib/auth.tsx` atualiza o estado, e o `useEffect` em `/auth` redireciona para `/dashboard` quando `user` existe. Pequenos ajustes:

- **`src/routes/auth.tsx`**: remover `redirect_uri` customizado apontando para `/dashboard` (o broker OAuth gerenciado espera `window.location.origin` como base; o redirect interno para `/dashboard` é responsabilidade do `useEffect`). Adicionar estado `loading` no botão Google e fechar com `toast` em caso de sucesso silencioso.
- **`src/routes/dashboard.tsx`**: já redireciona para `/auth` se não autenticado — ok.
- **`src/lib/auth.tsx`**: o listener já faz `loadFor(user)` e o subscribe de balances em realtime se mantém. Sem mudanças necessárias.

Resultado: usuário clica em "Continuar com Google" → autoriza → volta para a app → sessão persistida em `localStorage` pelo client Supabase → `onAuthStateChange` dispara → `/auth` redireciona para `/dashboard`.

---

## Parte 2 — Corrigir aviso de segurança

**Achado**: `anon` e `authenticated` têm `EXECUTE` em todas as funções `SECURITY DEFINER` por padrão no schema `public`. Isso permite que qualquer um (incluindo não-autenticados) tente chamar funções administrativas — a validação interna `has_role` bloqueia, mas é melhor revogar o acesso na superfície da API.

**Migration nova** (`supabase/migrations/<timestamp>_lockdown_definer_functions.sql`):

```sql
-- Funções admin: só admin chama, ninguém mais precisa de EXECUTE
revoke execute on function public.admin_resolve_deposit(uuid, boolean) from anon, authenticated, public;
revoke execute on function public.admin_resolve_withdraw(uuid, boolean) from anon, authenticated, public;
revoke execute on function public.admin_adjust_balance(uuid, numeric, text) from anon, authenticated, public;
revoke execute on function public.admin_set_deposit_pix(uuid, text) from anon, authenticated, public;
revoke execute on function public.admin_list_users() from anon, authenticated, public;
grant execute on function public.admin_resolve_deposit(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_withdraw(uuid, boolean) to authenticated;
grant execute on function public.admin_adjust_balance(uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_deposit_pix(uuid, text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
-- (mantém para authenticated porque o RPC precisa ser chamável; has_role() interno bloqueia não-admins)

-- game_play: só usuário logado
revoke execute on function public.game_play(text, numeric, numeric, text) from anon, public;
grant execute on function public.game_play(text, numeric, numeric, text) to authenticated;

-- has_role / request_owner: usadas em policies RLS, precisam ficar acessíveis
-- (mantém defaults; são SECURITY DEFINER mas só leem dados de role do próprio invocador)
```

Isso elimina o caminho `anon → admin_*` e `anon → game_play`, fechando o aviso para os RPCs principais. As funções `has_role` e `request_owner` permanecem porque são chamadas dentro de policies RLS (não diretamente da API) e expor seu EXECUTE não vaza dados — ambas só verificam papéis/donos do próprio user.

---

## Resumo das mudanças

- `src/routes/auth.tsx`: simplificar `handleGoogle` (remover `redirect_uri` customizado, adicionar loading).
- Nova migration para revogar/conceder EXECUTE seletivo nas funções `SECURITY DEFINER`.
- Marcar finding como corrigido após aplicar a migration.