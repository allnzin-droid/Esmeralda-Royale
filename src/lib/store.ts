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

// ===== Admin PIN local (UI extra) — não é auth, é só uma confirmação 2-etapas no painel =====
const PIN_TTL_MS = 5 * 60 * 1000;
const K_PIN = "casino.admin.pin";
const K_UNLOCK = "casino.admin.pin.unlock";

const safeGet = (k: string) => (typeof window === "undefined" ? null : localStorage.getItem(k));
const safeSet = (k: string, v: string) => typeof window !== "undefined" && localStorage.setItem(k, v);

export const adminPin = {
  isSet: () => !!safeGet(K_PIN),
  set: (pin: string) => safeSet(K_PIN, pin),
  clear: () => typeof window !== "undefined" && localStorage.removeItem(K_PIN),
  verify: (pin: string) => safeGet(K_PIN) === pin,
  unlock: () => safeSet(K_UNLOCK, String(Date.now() + PIN_TTL_MS)),
  isUnlocked: () => {
    const t = Number(safeGet(K_UNLOCK) ?? 0);
    return t > Date.now();
  },
  lock: () => safeSet(K_UNLOCK, "0"),
  remainingMs: () => Math.max(0, Number(safeGet(K_UNLOCK) ?? 0) - Date.now()),
};
