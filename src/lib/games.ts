import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCallback } from "react";

/**
 * Server-authoritative game play.
 *
 * The result of every round is decided by a SECURITY DEFINER function in
 * Postgres. The client only sends the bet (and any user choice) and receives
 * the canonical result + new balance. This prevents tampering — the browser
 * cannot decide its own win amount anymore.
 */

type RpcName =
  | "play_crash"
  | "play_coin"
  | "play_roulette"
  | "play_slots"
  | "play_tiger"
  | "play_lucky"
  | "play_boxes";

export function usePlay() {
  const { user, refresh } = useAuth();

  const validateBet = useCallback(
    (amount: number): boolean => {
      if (!user) {
        toast.error("Faça login");
        return false;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Valor de aposta inválido");
        return false;
      }
      if (amount > user.balance) {
        toast.error("Saldo insuficiente");
        return false;
      }
      return true;
    },
    [user],
  );

  const play = useCallback(
    async <T = unknown>(rpc: RpcName, args: Record<string, unknown>): Promise<T | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc(rpc as any, args as any);
      if (error) {
        const msg = error.message || "";
        if (msg.includes("insufficient_balance")) toast.error("Saldo insuficiente");
        else if (msg.includes("invalid_bet")) toast.error("Aposta inválida");
        else if (msg.includes("not_authenticated")) toast.error("Faça login");
        else toast.error("Erro: " + msg);
        return null;
      }
      // Realtime atualiza o saldo, mas garantimos refresh em caso de falha do canal
      void refresh();
      return data as T;
    },
    [refresh],
  );

  return { user, validateBet, play };
}

export function randomInt(min: number, max: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % (max - min + 1));
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}
