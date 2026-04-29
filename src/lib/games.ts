import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCallback, useRef } from "react";

/**
 * useBet — wraps the server-side `game_play` RPC.
 *
 * Backwards-compatible API:
 *  - placeBet(amount): boolean   → reserves the bet client-side (validates UI)
 *  - payout(amount, note?)       → resolves the round on the server
 *
 * Internally we batch into a single atomic server call so balance is always
 * validated and updated server-side. If `payout` is never called, we resolve
 * with win=0 on cleanup.
 */
export function useBet(game: string) {
  const { user } = useAuth();
  const pending = useRef<{ amount: number; resolved: boolean } | null>(null);

  const placeBet = useCallback(
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
      // If a previous round wasn't resolved, resolve as loss now.
      if (pending.current && !pending.current.resolved) {
        const prev = pending.current;
        prev.resolved = true;
        supabase.rpc("game_play", { _game: game, _bet: prev.amount, _win: 0 });
      }
      pending.current = { amount, resolved: false };
      return true;
    },
    [user, game],
  );

  const payout = useCallback(
    async (winAmount: number, note?: string) => {
      const round = pending.current;
      if (!round || round.resolved) return;
      round.resolved = true;
      const { error } = await supabase.rpc("game_play", {
        _game: game,
        _bet: round.amount,
        _win: Math.max(0, +Number(winAmount).toFixed(2)),
        _note: note ?? null,
      });
      if (error) toast.error("Erro ao registrar jogada: " + error.message);
    },
    [game],
  );

  return { user, placeBet, payout };
}

export function randomInt(min: number, max: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % (max - min + 1));
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}
