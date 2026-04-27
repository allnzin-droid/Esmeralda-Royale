import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { store, type User, uid, ADMIN_EMAIL } from "./store";

type AuthCtx = {
  user: User | null;
  isAdmin: boolean;
  signUp: (email: string, name: string, password: string) => { ok: boolean; error?: string };
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
  refresh: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const refresh = () => {
    const id = store.getSession();
    const u = id ? store.getUsers().find((x) => x.id === id) ?? null : null;
    setUser(u);
  };

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("casino:update", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("casino:update", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const signUp: AuthCtx["signUp"] = (email, name, password) => {
    email = email.trim().toLowerCase();
    if (!email || !name || password.length < 4) return { ok: false, error: "Preencha todos os campos (senha 4+ caracteres)" };
    const users = store.getUsers();
    if (users.some((u) => u.email === email)) return { ok: false, error: "E-mail já cadastrado" };
    const newU: User = { id: uid(), email, name, password, balance: 0, createdAt: Date.now() };
    users.push(newU);
    store.setUsers(users);
    store.setSession(newU.id);
    return { ok: true };
  };

  const signIn: AuthCtx["signIn"] = (email, password) => {
    email = email.trim().toLowerCase();
    const u = store.getUsers().find((x) => x.email === email && x.password === password);
    if (!u) return { ok: false, error: "Credenciais inválidas" };
    store.setSession(u.id);
    return { ok: true };
  };

  const signOut = () => store.setSession(null);

  return (
    <Ctx.Provider value={{ user, isAdmin: !!user && user.email === ADMIN_EMAIL, signUp, signIn, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
