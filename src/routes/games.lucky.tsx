import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/lucky")({ component: Lucky });

type LuckyResult = { mult: number; win: number; balance: number };

function Lucky() {
  const [bet, setBet] = useState(10);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [scratching, setScratching] = useState(false);
  const { validateBet, play } = usePlay();

  const scratch = async () => {
    if (!validateBet(bet)) return;
    setScratching(true);
    setRevealed(null);
    const res = await play<LuckyResult>("play_lucky", { _bet: bet });
    if (!res) {
      setScratching(false);
      return;
    }
    setTimeout(() => {
      setRevealed(Number(res.mult));
      setScratching(false);
      if (res.win > 0) toast.success(`🎟️ x${res.mult}! +${res.win.toFixed(2)}`);
      else toast.error("Não foi dessa vez.");
    }, 1000);
  };

  return (
    <GameLayout title="Raspadinha da Sorte" description="Prêmios de 0.5x até 30x." bet={bet} setBet={setBet} disabled={scratching}>
      <div className="text-center mb-6">
        <div className={`inline-block h-40 w-40 rounded-2xl bg-gradient-gold border-4 border-gold/60 shadow-gold grid place-items-center font-display text-5xl text-background ${scratching ? "animate-pulse" : ""}`}>
          {scratching ? "🎟️" : revealed === null ? "?" : revealed === 0 ? "❌" : `${revealed}x`}
        </div>
      </div>
      <Button onClick={scratch} disabled={scratching} className="w-full bg-gradient-emerald shadow-emerald">
        {scratching ? "Raspando..." : "Raspar"}
      </Button>
      <div className="mt-4 grid grid-cols-5 gap-1 text-center text-xs">
        {[0.5, 1.5, 3, 8, 30].map((m) => (
          <div key={m} className="bg-secondary rounded p-1">
            <div className="text-gold font-mono">x{m}</div>
          </div>
        ))}
      </div>
    </GameLayout>
  );
}
