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

// ===== Admin PIN local (UI extra) =====
// NÃO é autenticação — apenas uma confirmação 2-etapas no painel.
// O hash do PIN fica em sessionStorage (limpo ao fechar a aba).
// Inclui lockout após 5 tentativas erradas até recarregar a página.
const PIN_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const K_PIN_HASH = "casino.admin.pin.hash";
const K_UNLOCK = "casino.admin.pin.unlock";
const K_ATTEMPTS = "casino.admin.pin.attempts";

const ss = {
  get: (k: string) => (typeof window === "undefined" ? null : sessionStorage.getItem(k)),
  set: (k: string, v: string) => typeof window !== "undefined" && sessionStorage.setItem(k, v),
  del: (k: string) => typeof window !== "undefined" && sessionStorage.removeItem(k),
};

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const adminPin = {
  isSet: () => !!ss.get(K_PIN_HASH),
  set: async (pin: string) => ss.set(K_PIN_HASH, await sha256Hex(pin)),
  clear: () => {
    ss.del(K_PIN_HASH);
    ss.del(K_UNLOCK);
    ss.del(K_ATTEMPTS);
  },
  verify: async (pin: string): Promise<boolean> => {
    const attempts = Number(ss.get(K_ATTEMPTS) ?? 0);
    if (attempts >= MAX_ATTEMPTS) return false;
    const stored = ss.get(K_PIN_HASH);
    const ok = stored !== null && stored === (await sha256Hex(pin));
    if (ok) {
      ss.set(K_ATTEMPTS, "0");
    } else {
      ss.set(K_ATTEMPTS, String(attempts + 1));
    }
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
