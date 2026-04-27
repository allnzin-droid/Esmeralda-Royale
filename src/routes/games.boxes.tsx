import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useBet, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/boxes")({ component: Boxes });

const PRIZES = [0, 0, 1, 2, 3, 5]; // multipliers, shuffled each round

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Boxes() {
  const [bet, setBet] = useState(10);
  const [prizes, setPrizes] = useState<number[]>(shuffle(PRIZES));
  const [opened, setOpened] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>(Array(6).fill(false));
  const [locked, setLocked] = useState(false);
  const { placeBet, payout } = useBet("Caixas");

  const start = () => {
    if (!placeBet(bet)) return;
    setPrizes(shuffle(PRIZES));
    setRevealed(Array(6).fill(false));
    setOpened(null);
    setLocked(false);
  };

  const open = (i: number) => {
    if (locked || opened !== null) return;
    if (prizes[i] === undefined) {
      toast.error("Aposte primeiro");
      return;
    }
    setOpened(i);
    setLocked(true);
    // reveal chosen, then others gradually
    const newRev = [...revealed];
    newRev[i] = true;
    setRevealed(newRev);
    setTimeout(() => {
      const final = newRev.map(() => true);
      setRevealed(final);
      const m = prizes[i];
      if (m > 0) {
        payout(bet * m, `Caixa x${m}`);
        toast.success(`🎁 Caixa x${m} → +${(bet * m).toFixed(2)}`);
      } else {
        toast.error("Caixa vazia 😢");
      }
    }, 700);
  };

  return (
    <GameLayout title="Caixas Premiadas" description="6 caixas, prêmios escondidos: 0x, 0x, 1x, 2x, 3x, 5x." bet={bet} setBet={setBet} disabled={false}>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {prizes.map((m, i) => (
          <button
            key={i}
            onClick={() => open(i)}
            disabled={locked && opened !== i ? false : false}
            className={`aspect-square rounded-2xl border-2 transition-all grid place-items-center font-display text-3xl ${
              revealed[i]
                ? m > 0 ? "bg-gradient-gold border-gold ring-gold" : "bg-secondary border-border opacity-60"
                : "bg-card border-gold/30 hover:border-gold hover:scale-105 cursor-pointer"
            } ${opened === i ? "animate-float-up" : ""}`}
          >
            {revealed[i] ? (m > 0 ? `${m}x` : "❌") : "🎁"}
          </button>
        ))}
      </div>
      <Button onClick={start} className="w-full bg-gradient-emerald shadow-emerald">
        {opened !== null ? "Nova rodada" : "Apostar e escolher"}
      </Button>
    </GameLayout>
  );
}
