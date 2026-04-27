import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useBet, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/slots")({ component: Slots });

const SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "⭐", "💎", "7️⃣"];
const PAYOUTS: Record<string, number> = { "🍒": 3, "🍋": 4, "🍇": 5, "🔔": 8, "⭐": 12, "💎": 25, "7️⃣": 50 };

function Slots() {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>(["🍒", "🍋", "🍇"]);
  const [spinning, setSpinning] = useState(false);
  const { placeBet, payout } = useBet("Slots");

  const spin = () => {
    if (!placeBet(bet)) return;
    setSpinning(true);
    let ticks = 0;
    const iv = setInterval(() => {
      setReels([SYMBOLS[randomInt(0, 6)], SYMBOLS[randomInt(0, 6)], SYMBOLS[randomInt(0, 6)]]);
      ticks++;
      if (ticks >= 14) {
        clearInterval(iv);
        // Final result with house-edge weighted distribution
        const final: string[] = [];
        for (let i = 0; i < 3; i++) {
          const r = Math.random();
          // weighted: rarer = higher index
          const idx = r < 0.35 ? randomInt(0, 1) : r < 0.65 ? randomInt(2, 3) : r < 0.88 ? 4 : r < 0.97 ? 5 : 6;
          final.push(SYMBOLS[idx]);
        }
        setReels(final);
        setSpinning(false);
        if (final[0] === final[1] && final[1] === final[2]) {
          const m = PAYOUTS[final[0]];
          payout(bet * m, `Slots ${final[0]} x${m}`);
          toast.success(`🎰 ${final.join(" ")} → x${m}!`);
        } else if (final[0] === final[1] || final[1] === final[2]) {
          payout(bet * 1.5, `Slots par x1.5`);
          toast.success(`Par! +${(bet * 1.5).toFixed(2)}`);
        } else {
          toast.error("Sem combinação 😞");
        }
      }
    }, 90);
  };

  return (
    <GameLayout title="Caça-Níqueis" description="3 iguais paga até 50x. Par paga 1.5x." bet={bet} setBet={setBet} disabled={spinning}>
      <div className="rounded-2xl bg-background/60 border-2 border-gold/40 p-6 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {reels.map((s, i) => (
            <div key={i} className={`aspect-square rounded-xl bg-gradient-emerald grid place-items-center text-6xl shadow-emerald ${spinning ? "animate-pulse" : ""}`}>
              {s}
            </div>
          ))}
        </div>
      </div>
      <Button onClick={spin} disabled={spinning} className="w-full bg-gradient-gold shadow-gold h-12 text-lg">
        {spinning ? "Girando..." : "GIRAR 🎰"}
      </Button>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
        {Object.entries(PAYOUTS).map(([s, m]) => (
          <div key={s} className="bg-secondary rounded p-1">
            <div className="text-lg">{s}</div>
            <div className="text-gold font-mono">x{m}</div>
          </div>
        ))}
      </div>
    </GameLayout>
  );
}
