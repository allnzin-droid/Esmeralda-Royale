import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import type { DepositRequest, WithdrawRequest, HistoryEntry, RequestMessage } from "./store";

type Row = Record<string, any>;

const toMsg = (r: Row): RequestMessage => ({
  id: r.id,
  from: r.from_role,
  text: r.text ?? undefined,
  attachment: r.attachment_data_url
    ? { name: r.attachment_name ?? "anexo", dataUrl: r.attachment_data_url }
    : undefined,
  createdAt: new Date(r.created_at).getTime(),
});

const groupMessages = (rows: Row[]) => {
  const map: Record<string, RequestMessage[]> = {};
  for (const r of rows) {
    const k = r.request_id as string;
    (map[k] ||= []).push(toMsg(r));
  }
  return map;
};

export function useDeposits(): DepositRequest[] {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<DepositRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const load = async () => {
      const dq = supabase.from("deposit_requests").select("*").order("created_at", { ascending: false });
      const { data: deps } = await dq;
      const ids = (deps ?? []).map((d) => d.id);
      let msgsByReq: Record<string, RequestMessage[]> = {};
      if (ids.length) {
        const { data: msgs } = await supabase
          .from("request_messages")
          .select("*")
          .eq("request_kind", "deposit")
          .in("request_id", ids)
          .order("created_at", { ascending: true });
        msgsByReq = groupMessages(msgs ?? []);
      }
      // For admin, fetch profiles for emails
      let emailById: Record<string, string> = {};
      if (isAdmin && deps?.length) {
        const userIds = Array.from(new Set(deps.map((d) => d.user_id)));
        const { data: profs } = await supabase.from("profiles").select("id,email").in("id", userIds);
        emailById = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email]));
      }
      if (ignore) return;
      setData(
        (deps ?? []).map((d) => ({
          id: d.id,
          userId: d.user_id,
          userEmail: emailById[d.user_id] ?? (user.id === d.user_id ? user.email : ""),
          amount: Number(d.amount),
          status: d.status as DepositRequest["status"],
          pixKey: d.pix_key ?? undefined,
          createdAt: new Date(d.created_at).getTime(),
          resolvedAt: d.resolved_at ? new Date(d.resolved_at).getTime() : undefined,
          messages: msgsByReq[d.id] ?? [],
        })),
      );
    };
    load();
    const ch = supabase
      .channel("deps-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_messages" }, load)
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id, isAdmin]);

  return data;
}

export function useWithdrawals(): WithdrawRequest[] {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<WithdrawRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const load = async () => {
      const { data: wits } = await supabase
        .from("withdraw_requests")
        .select("*")
        .order("created_at", { ascending: false });
      const ids = (wits ?? []).map((w) => w.id);
      let msgsByReq: Record<string, RequestMessage[]> = {};
      if (ids.length) {
        const { data: msgs } = await supabase
          .from("request_messages")
          .select("*")
          .eq("request_kind", "withdraw")
          .in("request_id", ids)
          .order("created_at", { ascending: true });
        msgsByReq = groupMessages(msgs ?? []);
      }
      let emailById: Record<string, string> = {};
      if (isAdmin && wits?.length) {
        const userIds = Array.from(new Set(wits.map((w) => w.user_id)));
        const { data: profs } = await supabase.from("profiles").select("id,email").in("id", userIds);
        emailById = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email]));
      }
      if (ignore) return;
      setData(
        (wits ?? []).map((w) => ({
          id: w.id,
          userId: w.user_id,
          userEmail: emailById[w.user_id] ?? (user.id === w.user_id ? user.email : ""),
          amount: Number(w.amount),
          pixKey: w.pix_key,
          status: w.status as WithdrawRequest["status"],
          createdAt: new Date(w.created_at).getTime(),
          resolvedAt: w.resolved_at ? new Date(w.resolved_at).getTime() : undefined,
          messages: msgsByReq[w.id] ?? [],
        })),
      );
    };
    load();
    const ch = supabase
      .channel("wits-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdraw_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_messages" }, load)
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id, isAdmin]);

  return data;
}

export function useHistory(): HistoryEntry[] {
  const { user } = useAuth();
  const [data, setData] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from("history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (ignore) return;
      setData(
        (rows ?? []).map((r) => ({
          id: r.id,
          userId: r.user_id,
          type: r.type as HistoryEntry["type"],
          game: r.game ?? undefined,
          amount: Number(r.amount),
          balanceAfter: Number(r.balance_after),
          note: r.note ?? undefined,
          createdAt: new Date(r.created_at).getTime(),
        })),
      );
    };
    load();
    const ch = supabase
      .channel("hist-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "history", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);
  return data;
}

// Admin-only listing of users with balances/role
export type AdminUserRow = { id: string; email: string; name: string; balance: number; isAdmin: boolean };
export function useUsers(): AdminUserRow[] {
  const { isAdmin, user } = useAuth();
  const [data, setData] = useState<AdminUserRow[]>([]);
  useEffect(() => {
    if (!isAdmin || !user) return;
    let ignore = false;
    const load = async () => {
      const { data: rows } = await supabase.rpc("admin_list_users");
      if (ignore) return;
      setData(
        (rows ?? []).map((r: any) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          balance: Number(r.balance),
          isAdmin: !!r.is_admin,
        })),
      );
    };
    load();
    const ch = supabase
      .channel("users-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "balances" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(ch);
    };
  }, [isAdmin, user?.id]);
  return data;
}
