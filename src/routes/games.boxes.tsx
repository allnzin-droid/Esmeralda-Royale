import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay } from "@/lib/games";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/games/boxes")({ component: Boxes });

type StartRes = { round_id: string; target: number; balance: number };
type PickRes = {
  mult: number;
  is_x: boolean;
  done: boolean;
  win: number;
  balance: number;
  picks: number[];
  total_mult?: number;
};

function Boxes() {
  const [bet, setBet] = useState(1);
  const [target, setTarget] = useState(1);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<number, { mult: number; is_x: boolean }>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { validateBet, play } = usePlay();

  const start = async () => {
    if (busy) return;
    if (!validateBet(bet)) return;
    setBusy(true);
    setOpened({});
    setDone(false);
    const res = await play<StartRes>("boxes_start" as never, { _bet: bet, _target: target });
    setBusy(false);
    if (!res) return;
    setRoundId(res.round_id);
  };

  const pick = async (i: number) => {
    if (!roundId || busy || done || opened[i]) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc("boxes_pick" as any, { _round_id: roundId, _index: i } as any);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const r = data as PickRes;
    setOpened((o) => ({ ...o, [i]: { mult: r.mult, is_x: r.is_x } }));
    if (r.is_x) {
      setDone(true);
      toast.error("💀 X! Você perdeu tudo.");
    } else if (r.done) {
      setDone(true);
      toast.success(`🎁 +${r.win.toFixed(2)} (x${r.total_mult ?? r.mult})`);
    } else {
      toast.success(`✓ x${r.mult} — falta ${target - (r.picks?.length ?? 0)}`);
    }
  };

  const reset = () => {
    setRoundId(null);
    setOpened({});
    setDone(false);
  };

  const playing = !!roundId && !done;
  const remaining = target - Object.keys(opened).length;

  return (
    <GameLayout
      title="Caixas Premiadas"
      description="6 caixas. Escolha sua meta (1-3) e abra UMA POR VEZ. Se achar X antes, perde tudo."
      bet={bet}
      setBet={setBet}
      disabled={busy || playing}
    >
      <div className="mb-4 rounded-xl border border-gold/30 bg-card/60 p-4">
        <div className="text-sm text-muted-foreground mb-3">Meta de caixas para abrir</div>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <Button
              key={n}
              variant={target === n ? "default" : "outline"}
              disabled={busy || playing}
              onClick={() => setTarget(n)}
              className={`flex-1 ${target === n ? "bg-gradient-gold" : "border-gold/30"}`}
            >
              {n} caixa{n > 1 ? "s" : ""}
            </Button>
          ))}
        </div>
        {playing && (
          <div className="mt-3 text-xs text-center text-gold">
            Faltam {remaining} para bater a meta — cuidado com o X!
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 6 }, (_, i) => {
          const op = opened[i];
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={!playing || !!op || busy}
              className={`aspect-square rounded-2xl border-2 grid place-items-center font-display text-3xl transition-all ${
                op
                  ? op.is_x
                    ? "bg-destructive/30 border-destructive"
                    : "bg-gradient-gold border-gold"
                  : playing
                    ? "bg-card border-gold/60 hover:scale-105 hover:border-gold cursor-pointer"
                    : "bg-secondary/40 border-border opacity-60"
              }`}
            >
              {op ? (op.is_x ? "💀" : `${op.mult}x`) : "🎁"}
            </button>
          );
        })}
      </div>

      {!playing ? (
        <Button onClick={start} disabled={busy} className="w-full bg-gradient-emerald shadow-emerald h-12">
          {busy ? "Iniciando..." : roundId ? "Nova rodada" : `Apostar ${bet.toFixed(2)} (meta ${target})`}
        </Button>
      ) : (
        <Button onClick={reset} variant="outline" className="w-full h-12 border-destructive/40 text-destructive">
          Desistir (perde a aposta)
        </Button>
      )}

      {done && roundId && (
        <Button onClick={reset} className="mt-2 w-full bg-gradient-gold shadow-gold h-12">
          Jogar de novo
        </Button>
      )}
    </GameLayout>
  );
}
