import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User as SupaUser } from "@supabase/supabase-js";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  balance: number;
};

type AuthCtx = {
  user: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFor = async (su: SupaUser) => {
    const [{ data: prof }, { data: bal }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("name,email").eq("id", su.id).maybeSingle(),
      supabase.from("balances").select("amount").eq("user_id", su.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", su.id),
    ]);
    setProfile(prof ?? { name: su.email?.split("@")[0] ?? "", email: su.email ?? "" });
    setBalance(Number(bal?.amount ?? 0));
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  };

  const refresh = async () => {
    if (!session?.user) return;
    await loadFor(session.user);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadFor(s.user), 0);
      } else {
        setProfile(null);
        setBalance(0);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadFor(data.session.user);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Polling de saldo (realtime removido por segurança)
  useEffect(() => {
    if (!session?.user) return;
    const id = setInterval(() => {
      loadFor(session.user);
    }, 5000);
    return () => clearInterval(id);
  }, [session?.user?.id]);

  const signUp: AuthCtx["signUp"] = async (email, name, password) => {
    email = email.trim().toLowerCase();
    if (!email || !name || password.length < 6) return { ok: false, error: "Preencha tudo (senha 6+ caracteres)" };
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { name } },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    email = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: "Credenciais inválidas" };
    return { ok: true };
  };

  const signOut = async () => {
    // Limpa o PIN do admin ao sair
    const { adminPin } = await import("@/lib/store");
    adminPin.clear();
    await supabase.auth.signOut();
  };

  const user: AppUser | null = session?.user
    ? {
        id: session.user.id,
        email: profile?.email ?? session.user.email ?? "",
        name: profile?.name ?? session.user.email?.split("@")[0] ?? "",
        balance,
      }
    : null;

  return (
    <Ctx.Provider value={{ user, isAdmin, loading, signUp, signIn, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
