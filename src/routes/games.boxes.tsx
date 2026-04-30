import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/boxes")({ component: Boxes });

type BoxesResult = { winner: boolean; mult: number; win: number; balance: number; pick: number };

function Boxes() {
  const [bet, setBet] = useState(10);
  const [opened, setOpened] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ mult: number; win: number } | null>(null);
  const [locked, setLocked] = useState(false);
  const { validateBet, play } = usePlay();

  const open = async (i: number) => {
    if (locked) return;
    if (!validateBet(bet)) return;
    setLocked(true);
    setOpened(i);
    setReveal(null);
    const res = await play<BoxesResult>("play_boxes", { _bet: bet, _pick: i });
    if (!res) {
      setLocked(false);
      setOpened(null);
      return;
    }
    setTimeout(() => {
      setReveal({ mult: Number(res.mult), win: Number(res.win) });
      if (res.win > 0) toast.success(`🎁 Caixa x${res.mult} → +${res.win.toFixed(2)}`);
      else toast.error("Caixa vazia 😢");
    }, 600);
  };

  const reset = () => {
    setOpened(null);
    setReveal(null);
    setLocked(false);
  };

  return (
    <GameLayout title="Caixas Premiadas" description="9 caixas — escolha uma. Prêmios escondidos até 15x." bet={bet} setBet={setBet} disabled={locked}>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 9 }, (_, i) => i).map((i) => {
          const isOpened = opened === i;
          const showReveal = isOpened && reveal !== null;
          return (
            <button
              key={i}
              onClick={() => open(i)}
              disabled={locked}
              className={`aspect-square rounded-2xl border-2 transition-all grid place-items-center font-display text-3xl ${
                showReveal
                  ? reveal!.win > 0
                    ? "bg-gradient-gold border-gold ring-gold animate-float-up"
                    : "bg-secondary border-border opacity-60"
                  : "bg-card border-gold/30 hover:border-gold hover:scale-105 cursor-pointer"
              }`}
            >
              {showReveal ? (reveal!.win > 0 ? `${reveal!.mult}x` : "❌") : "🎁"}
            </button>
          );
        })}
      </div>
      <Button onClick={reset} disabled={!reveal} className="w-full bg-gradient-emerald shadow-emerald">
        Nova rodada
      </Button>
    </GameLayout>
  );
}
