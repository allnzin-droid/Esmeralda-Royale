// Local demo store (no backend). All data lives in localStorage.
// WARNING: Demo only — admin status here is client-side and not secure.

export const ADMIN_EMAIL = "adminhelpfaxina@gmail.com";

export type User = {
  id: string;
  email: string;
  name: string;
  password: string; // demo only
  balance: number;
  createdAt: number;
};

export type RequestMessage = {
  id: string;
  from: "user" | "admin";
  text?: string;
  attachment?: { name: string; dataUrl: string }; // base64 (comprovante)
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
  pixKey?: string; // chave PIX enviada pelo admin
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
  amount: number; // signed
  balanceAfter: number;
  createdAt: number;
  note?: string;
};

const K = {
  users: "casino.users",
  session: "casino.session",
  deposits: "casino.deposits",
  withdrawals: "casino.withdrawals",
  history: "casino.history",
};

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("casino:update"));
}

export const store = {
  // users
  getUsers: () => read<User[]>(K.users, []),
  setUsers: (u: User[]) => write(K.users, u),

  // session
  getSession: () => read<string | null>(K.session, null),
  setSession: (id: string | null) => write(K.session, id),

  // deposits
  getDeposits: () => read<DepositRequest[]>(K.deposits, []),
  setDeposits: (d: DepositRequest[]) => write(K.deposits, d),

  // withdrawals
  getWithdrawals: () => read<WithdrawRequest[]>(K.withdrawals, []),
  setWithdrawals: (w: WithdrawRequest[]) => write(K.withdrawals, w),

  // history
  getHistory: () => read<HistoryEntry[]>(K.history, []),
  setHistory: (h: HistoryEntry[]) => write(K.history, h),
};

export const isAdmin = (u?: User | null) => !!u && u.email.toLowerCase() === ADMIN_EMAIL;

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
  const list = store.getHistory();
  list.unshift({ ...entry, id: uid(), createdAt: Date.now() });
  store.setHistory(list.slice(0, 500));
}

export function adjustBalance(userId: string, delta: number, opts: { type: HistoryEntry["type"]; game?: string; note?: string }) {
  const users = store.getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  const newBal = Math.max(0, +(users[idx].balance + delta).toFixed(2));
  users[idx] = { ...users[idx], balance: newBal };
  store.setUsers(users);
  addHistory({ userId, type: opts.type, game: opts.game, amount: delta, balanceAfter: newBal, note: opts.note });
  return users[idx];
}

export function addDepositMessage(id: string, msg: Omit<RequestMessage, "id" | "createdAt">) {
  const list = store.getDeposits();
  const i = list.findIndex((d) => d.id === id);
  if (i === -1) return;
  list[i].messages = [...(list[i].messages || []), { ...msg, id: uid(), createdAt: Date.now() }];
  store.setDeposits(list);
}

export function addWithdrawMessage(id: string, msg: Omit<RequestMessage, "id" | "createdAt">) {
  const list = store.getWithdrawals();
  const i = list.findIndex((w) => w.id === id);
  if (i === -1) return;
  list[i].messages = [...(list[i].messages || []), { ...msg, id: uid(), createdAt: Date.now() }];
  store.setWithdrawals(list);
}
