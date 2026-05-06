// Backend-backed types and helpers. Data lives in Supabase (Lovable Cloud).
import { supabase } from "@/integrations/supabase/client";

export type RequestMessage = {
  id: string;
  from: "user" | "admin";
  text?: string;
  attachment?: { name: string; dataUrl: string };
  createdAt: number;
};

export type DepositRequest = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: "pending" | "awaiting_payment" | "approved" | "rejected";
  createdAt: number;
  resolvedAt?: number;
  pixKey?: string;
  messages?: RequestMessage[];
};

export type WithdrawRequest = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  pixKey: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  resolvedAt?: number;
  messages?: RequestMessage[];
};

export type HistoryEntry = {
  id: string;
  userId: string;
  type: "deposit" | "bet" | "win" | "adjust";
  game?: string;
  amount: number;
  balanceAfter: number;
  createdAt: number;
  note?: string;
};

// ===== Mensagens =====
export async function addDepositMessage(
  requestId: string,
  msg: { from: "user" | "admin"; text?: string; attachment?: { name: string; dataUrl: string } },
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("request_messages").insert({
    request_kind: "deposit",
    request_id: requestId,
    user_id: u.user.id,
    from_role: msg.from,
    text: msg.text ?? null,
    attachment_name: msg.attachment?.name ?? null,
    attachment_data_url: msg.attachment?.dataUrl ?? null,
  });
}

export async function addWithdrawMessage(
  requestId: string,
  msg: { from: "user" | "admin"; text?: string; attachment?: { name: string; dataUrl: string } },
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("request_messages").insert({
    request_kind: "withdraw",
    request_id: requestId,
    user_id: u.user.id,
    from_role: msg.from,
    text: msg.text ?? null,
    attachment_name: msg.attachment?.name ?? null,
    attachment_data_url: msg.attachment?.dataUrl ?? null,
  });
}

// ===== Admin PIN — validado no SERVIDOR =====
// O hash NUNCA fica no navegador (anti-XSS). Cache local apenas:
// - "isSet" (boolean) para UI saber se já existe PIN
// - "unlock" (timestamp) para evitar pedir PIN várias vezes seguidas
// - "attempts" para lockout local de UI (sem permitir bypass — verify é server-side)
const PIN_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const K_HAS = "casino.admin.pin.has";
const K_UNLOCK = "casino.admin.pin.unlock";
const K_ATTEMPTS = "casino.admin.pin.attempts";

const ss = {
  get: (k: string) => (typeof window === "undefined" ? null : sessionStorage.getItem(k)),
  set: (k: string, v: string) => typeof window !== "undefined" && sessionStorage.setItem(k, v),
  del: (k: string) => typeof window !== "undefined" && sessionStorage.removeItem(k),
};

let _hasPinCache: boolean | null = null;
async function refreshHasPin(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await supabase.rpc("admin_pin_is_set" as any);
  _hasPinCache = !!data;
  ss.set(K_HAS, _hasPinCache ? "1" : "0");
  return _hasPinCache;
}

export const adminPin = {
  // sincrono via cache; chame refreshIsSet no mount
  isSet: () => {
    if (_hasPinCache !== null) return _hasPinCache;
    return ss.get(K_HAS) === "1";
  },
  refreshIsSet: refreshHasPin,
  set: async (pin: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.rpc("admin_pin_set" as any, { _pin: pin });
    if (error) throw error;
    _hasPinCache = true;
    ss.set(K_HAS, "1");
  },
  clear: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.rpc("admin_pin_clear" as any);
    _hasPinCache = false;
    ss.set(K_HAS, "0");
    ss.del(K_UNLOCK);
    ss.del(K_ATTEMPTS);
  },
  verify: async (pin: string): Promise<boolean> => {
    const attempts = Number(ss.get(K_ATTEMPTS) ?? 0);
    if (attempts >= MAX_ATTEMPTS) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc("admin_pin_verify" as any, { _pin: pin });
    const ok = !error && data === true;
    if (ok) ss.set(K_ATTEMPTS, "0");
    else ss.set(K_ATTEMPTS, String(attempts + 1));
    return ok;
  },
  isLockedOut: () => Number(ss.get(K_ATTEMPTS) ?? 0) >= MAX_ATTEMPTS,
  attemptsLeft: () => Math.max(0, MAX_ATTEMPTS - Number(ss.get(K_ATTEMPTS) ?? 0)),
  unlock: () => ss.set(K_UNLOCK, String(Date.now() + PIN_TTL_MS)),
  isUnlocked: () => {
    const t = Number(ss.get(K_UNLOCK) ?? 0);
    return t > Date.now();
  },
  lock: () => ss.set(K_UNLOCK, "0"),
  remainingMs: () => Math.max(0, Number(ss.get(K_UNLOCK) ?? 0) - Date.now()),
};
