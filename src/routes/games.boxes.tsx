import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/games/boxes")({ component: Boxes });

type Pick = { mult: number; is_x: boolean };
type BoxesResult = { picks: Pick[]; has_x: boolean; total_mult: number; win: number; balance: number };

function Boxes() {
  const { user } = useAuth();
  const [bet, setBet] = useState(1);
  const [count, setCount] = useState(1);
  const [reveal, setReveal] = useState<Pick[] | null>(null);
  const [hasX, setHasX] = useState(false);
  const [busy, setBusy] = useState(false);
  const { validateBet, play } = usePlay();

  // Máximo de caixas = min(3, floor(saldo/bet))
  const maxByBalance = Math.max(0, Math.floor((user?.balance ?? 0) / Math.max(bet, 0.01)));
  const maxCount = Math.min(3, maxByBalance);
  const safeCount = Math.min(count, Math.max(maxCount, 1));

  const open = async () => {
    if (busy) return;
    if (!validateBet(bet * safeCount)) return;
    if (safeCount < 1) {
      toast.error("Saldo insuficiente");
      return;
    }
    setBusy(true);
    setReveal(null);
    setHasX(false);
    const res = await play<BoxesResult>("play_boxes", { _bet: bet, _count: safeCount });
    if (!res) {
      setBusy(false);
      return;
    }
    setTimeout(() => {
      setReveal(res.picks);
      setHasX(res.has_x);
      setBusy(false);
      if (res.has_x) toast.error("💀 Achou o X — perdeu tudo!");
      else if (res.win > 0) toast.success(`🎁 +${Number(res.win).toFixed(2)} (x${res.total_mult})`);
      else toast.error("Sem prêmios 😢");
    }, 600);
  };

  const reset = () => {
    setReveal(null);
    setHasX(false);
  };

  return (
    <GameLayout
      title="Caixas Premiadas"
      description="Escolha quantas caixas abrir. Se 1 for X, perde TUDO. Máx 3 (limitado pelo saldo)."
      bet={bet}
      setBet={setBet}
      disabled={busy}
    >
      <div className="mb-4 rounded-xl border border-gold/30 bg-card/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Caixas a abrir</span>
          <span className="text-xs text-gold">Máx pelo saldo: {maxCount}</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <Button
              key={n}
              variant={safeCount === n ? "default" : "outline"}
              disabled={busy || n > maxCount}
              onClick={() => setCount(n)}
              className={`flex-1 ${safeCount === n ? "bg-gradient-gold" : "border-gold/30"}`}
            >
              {n} caixa{n > 1 ? "s" : ""}
            </Button>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Aposta total: <span className="text-gold font-mono">{(bet * safeCount).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }, (_, i) => {
          const pick = reveal?.[i];
          const opened = !!pick;
          return (
            <div
              key={i}
              className={`aspect-square rounded-2xl border-2 grid place-items-center font-display text-3xl transition-all ${
                opened
                  ? pick!.is_x
                    ? "bg-destructive/30 border-destructive"
                    : "bg-gradient-gold border-gold ring-gold animate-float-up"
                  : i < safeCount
                    ? "bg-card border-gold/60"
                    : "bg-secondary/40 border-border opacity-40"
              }`}
            >
              {opened ? (pick!.is_x ? "💀" : `${pick!.mult}x`) : i < safeCount ? "🎁" : "·"}
            </div>
          );
        })}
      </div>

      {!reveal ? (
        <Button onClick={open} disabled={busy || safeCount < 1} className="w-full bg-gradient-emerald shadow-emerald h-12">
          {busy ? "Abrindo..." : `Abrir ${safeCount} caixa${safeCount > 1 ? "s" : ""}`}
        </Button>
      ) : (
        <Button onClick={reset} className="w-full bg-gradient-gold shadow-gold h-12">
          Nova rodada
        </Button>
      )}

      {hasX && (
        <p className="mt-3 text-center text-destructive text-sm">
          ⚠️ Uma caixa era X — você perdeu todas as apostas dessa rodada.
        </p>
      )}
    </GameLayout>
  );
}
