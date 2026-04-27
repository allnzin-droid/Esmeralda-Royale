import { useAuth } from "@/lib/auth";
import { adjustBalance } from "@/lib/store";
import { toast } from "sonner";
import { useCallback } from "react";

export function useBet(game: string) {
  const { user } = useAuth();

  const placeBet = useCallback(
    (amount: number): boolean => {
      if (!user) return false;
      if (amount <= 0) {
        toast.error("Valor de aposta inválido");
        return false;
      }
      if (amount > user.balance) {
        toast.error("Saldo insuficiente");
        return false;
      }
      adjustBalance(user.id, -amount, { type: "bet", game });
      return true;
    },
    [user, game],
  );

  const payout = useCallback(
    (amount: number, note?: string) => {
      if (!user || amount <= 0) return;
      adjustBalance(user.id, amount, { type: "win", game, note });
    },
    [user, game],
  );

  return { user, placeBet, payout };
}

export function randomInt(min: number, max: number) {
  // Cryptographically random when available
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % (max - min + 1));
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}
