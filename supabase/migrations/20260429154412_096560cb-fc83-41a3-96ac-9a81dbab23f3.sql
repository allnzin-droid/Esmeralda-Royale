
-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "admins read all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Balances
create table public.balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now()
);
alter table public.balances enable row level security;

create policy "users read own balance" on public.balances
  for select to authenticated using (auth.uid() = user_id);
create policy "admins read all balances" on public.balances
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- History
create table public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('deposit','bet','win','adjust')),
  game text,
  amount numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  note text,
  created_at timestamptz not null default now()
);
create index history_user_created_idx on public.history(user_id, created_at desc);
alter table public.history enable row level security;

create policy "users read own history" on public.history
  for select to authenticated using (auth.uid() = user_id);
create policy "admins read all history" on public.history
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Deposit requests
create table public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0 and amount <= 100000),
  status text not null default 'pending' check (status in ('pending','awaiting_payment','approved','rejected')),
  pix_key text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index deposit_user_idx on public.deposit_requests(user_id, created_at desc);
alter table public.deposit_requests enable row level security;

create policy "users read own deposits" on public.deposit_requests
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own deposits" on public.deposit_requests
  for insert to authenticated with check (auth.uid() = user_id);
create policy "admins read all deposits" on public.deposit_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update deposits" on public.deposit_requests
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Withdraw requests
create table public.withdraw_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0 and amount <= 100000),
  pix_key text not null check (length(pix_key) between 1 and 120),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index withdraw_user_idx on public.withdraw_requests(user_id, created_at desc);
alter table public.withdraw_requests enable row level security;

create policy "users read own withdrawals" on public.withdraw_requests
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own withdrawals" on public.withdraw_requests
  for insert to authenticated with check (auth.uid() = user_id);
create policy "admins read all withdrawals" on public.withdraw_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update withdrawals" on public.withdraw_requests
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Request messages (deposit OR withdraw)
create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_kind text not null check (request_kind in ('deposit','withdraw')),
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_role text not null check (from_role in ('user','admin')),
  text text,
  attachment_name text,
  attachment_data_url text,
  created_at timestamptz not null default now()
);
create index request_messages_lookup_idx on public.request_messages(request_kind, request_id, created_at);
alter table public.request_messages enable row level security;

-- Helper: who owns a given request
create or replace function public.request_owner(_kind text, _request_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case
    when _kind = 'deposit' then (select user_id from public.deposit_requests where id = _request_id)
    when _kind = 'withdraw' then (select user_id from public.withdraw_requests where id = _request_id)
  end
$$;

create policy "owners read messages" on public.request_messages
  for select to authenticated
  using (public.request_owner(request_kind, request_id) = auth.uid());
create policy "admins read all messages" on public.request_messages
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "owner sends user messages" on public.request_messages
  for insert to authenticated with check (
    from_role = 'user'
    and user_id = auth.uid()
    and public.request_owner(request_kind, request_id) = auth.uid()
  );
create policy "admin sends admin messages" on public.request_messages
  for insert to authenticated with check (
    from_role = 'admin'
    and user_id = auth.uid()
    and public.has_role(auth.uid(), 'admin')
  );

-- Trigger: auto-create profile, balance, role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _name text := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, name) values (new.id, new.email, _name);
  insert into public.balances (user_id, amount) values (new.id, 0);
  if lower(new.email) = 'adminhelpfaxina@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== RPC: play a round (bet + payout atomically, server-validated) =====
create or replace function public.game_play(
  _game text,
  _bet numeric,
  _win numeric,
  _note text default null
)
returns numeric -- new balance
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _new numeric;
begin
  if _uid is null then raise exception 'not_authenticated'; end if;
  if _bet is null or _bet <= 0 or _bet > 100000 then raise exception 'invalid_bet'; end if;
  if _win is null or _win < 0 or _win > _bet * 1000 then raise exception 'invalid_win'; end if;

  select amount into _bal from public.balances where user_id = _uid for update;
  if _bal is null then raise exception 'no_balance_row'; end if;
  if _bal < _bet then raise exception 'insufficient_balance'; end if;

  -- bet
  _new := round(_bal - _bet, 2);
  update public.balances set amount = _new, updated_at = now() where user_id = _uid;
  insert into public.history(user_id, type, game, amount, balance_after, note)
    values (_uid, 'bet', _game, -_bet, _new, _note);

  -- win
  if _win > 0 then
    _new := round(_new + _win, 2);
    update public.balances set amount = _new, updated_at = now() where user_id = _uid;
    insert into public.history(user_id, type, game, amount, balance_after, note)
      values (_uid, 'win', _game, _win, _new, _note);
  end if;

  return _new;
end;
$$;

-- ===== RPC: admin approve deposit (credit balance + history) =====
create or replace function public.admin_resolve_deposit(_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  _r public.deposit_requests%rowtype;
  _bal numeric;
  _new numeric;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select * into _r from public.deposit_requests where id = _id for update;
  if not found then raise exception 'not_found'; end if;
  if _r.status not in ('pending','awaiting_payment') then raise exception 'invalid_status'; end if;

  if _approve then
    select amount into _bal from public.balances where user_id = _r.user_id for update;
    _new := round(coalesce(_bal,0) + _r.amount, 2);
    update public.balances set amount = _new, updated_at = now() where user_id = _r.user_id;
    insert into public.history(user_id, type, amount, balance_after, note)
      values (_r.user_id, 'deposit', _r.amount, _new, 'Depósito #' || substr(_r.id::text,1,6));
    update public.deposit_requests set status='approved', resolved_at=now() where id = _id;
  else
    update public.deposit_requests set status='rejected', resolved_at=now() where id = _id;
  end if;
end;
$$;

-- ===== RPC: admin approve withdraw (debit balance + history) =====
create or replace function public.admin_resolve_withdraw(_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  _r public.withdraw_requests%rowtype;
  _bal numeric;
  _new numeric;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select * into _r from public.withdraw_requests where id = _id for update;
  if not found then raise exception 'not_found'; end if;
  if _r.status <> 'pending' then raise exception 'invalid_status'; end if;

  if _approve then
    select amount into _bal from public.balances where user_id = _r.user_id for update;
    if coalesce(_bal,0) < _r.amount then raise exception 'insufficient_balance'; end if;
    _new := round(_bal - _r.amount, 2);
    update public.balances set amount = _new, updated_at = now() where user_id = _r.user_id;
    insert into public.history(user_id, type, amount, balance_after, note)
      values (_r.user_id, 'adjust', -_r.amount, _new, 'Saque PIX #' || substr(_r.id::text,1,6));
    update public.withdraw_requests set status='approved', resolved_at=now() where id = _id;
  else
    update public.withdraw_requests set status='rejected', resolved_at=now() where id = _id;
  end if;
end;
$$;

-- ===== RPC: admin manual balance adjustment =====
create or replace function public.admin_adjust_balance(_user_id uuid, _delta numeric, _note text default 'Ajuste manual admin')
returns numeric language plpgsql security definer set search_path = public as $$
declare _bal numeric; _new numeric;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if _delta is null or _delta = 0 then raise exception 'invalid_delta'; end if;
  select amount into _bal from public.balances where user_id = _user_id for update;
  _new := round(coalesce(_bal,0) + _delta, 2);
  if _new < 0 then _new := 0; end if;
  update public.balances set amount = _new, updated_at = now() where user_id = _user_id;
  insert into public.history(user_id, type, amount, balance_after, note)
    values (_user_id, 'adjust', _delta, _new, _note);
  return _new;
end;
$$;

-- ===== RPC: admin set deposit pix key (and move to awaiting_payment) =====
create or replace function public.admin_set_deposit_pix(_id uuid, _pix text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if _pix is null or length(trim(_pix)) = 0 or length(_pix) > 120 then raise exception 'invalid_pix'; end if;
  update public.deposit_requests
    set pix_key = trim(_pix), status = 'awaiting_payment'
    where id = _id and status in ('pending','awaiting_payment');
  if not found then raise exception 'not_found_or_finalized'; end if;
end;
$$;

-- ===== RPC: list users with balance and role (admin only) =====
create or replace function public.admin_list_users()
returns table(id uuid, email text, name text, balance numeric, is_admin boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.name, coalesce(b.amount,0) as balance,
         exists(select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin') as is_admin,
         p.created_at
  from public.profiles p
  left join public.balances b on b.user_id = p.id
  where public.has_role(auth.uid(), 'admin')
  order by p.created_at desc
$$;

-- Realtime
alter publication supabase_realtime add table public.balances;
alter publication supabase_realtime add table public.history;
alter publication supabase_realtime add table public.deposit_requests;
alter publication supabase_realtime add table public.withdraw_requests;
alter publication supabase_realtime add table public.request_messages;
