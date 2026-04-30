import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/tiger")({ component: Tiger });

const SYMBOLS = ["🐯", "🍊", "💰", "🏮", "🪙", "🐉"];
type TigerResult = { reels: [number, number, number]; win: number; mult: number; balance: number };

function Tiger() {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>([SYMBOLS[0], SYMBOLS[3], SYMBOLS[1]]);
  const [spinning, setSpinning] = useState(false);
  const { validateBet, play } = usePlay();

  const spin = async () => {
    if (!validateBet(bet)) return;
    setSpinning(true);
    const res = await play<TigerResult>("play_tiger", { _bet: bet });
    if (!res) {
      setSpinning(false);
      return;
    }
    let ticks = 0;
    const iv = setInterval(() => {
      setReels([
        SYMBOLS[randomInt(0, SYMBOLS.length - 1)],
        SYMBOLS[randomInt(0, SYMBOLS.length - 1)],
        SYMBOLS[randomInt(0, SYMBOLS.length - 1)],
      ]);
      ticks++;
      if (ticks >= 14) {
        clearInterval(iv);
        const final = res.reels.map((i) => SYMBOLS[i]);
        setReels(final);
        setSpinning(false);
        if (res.win > 0) toast.success(`🐯 ${final.join(" ")} → x${res.mult} (+${res.win.toFixed(2)})`);
        else toast.error("O tigre dormiu 😴");
      }
    }, 90);
  };

  return (
    <GameLayout title="Fortune Tiger 🐯" description="O tigrinho da sorte! 3 iguais paga até 20x." bet={bet} setBet={setBet} disabled={spinning}>
      <div className="rounded-2xl bg-gradient-to-br from-amber-950/60 to-red-950/60 border-2 border-gold/60 p-6 mb-6 shadow-gold">
        <div className="text-center mb-3 font-display text-2xl text-gold glow-gold">🐯 福 TIGRE DA SORTE 福 🐯</div>
        <div className="grid grid-cols-3 gap-3">
          {reels.map((s, i) => (
            <div key={i} className={`aspect-square rounded-xl bg-gradient-to-br from-yellow-700 to-red-800 grid place-items-center text-6xl shadow-emerald border-2 border-gold/40 ${spinning ? "animate-pulse" : ""}`}>
              {s}
            </div>
          ))}
        </div>
      </div>
      <Button onClick={spin} disabled={spinning} className="w-full bg-gradient-gold shadow-gold h-12 text-lg">
        {spinning ? "Girando..." : "GIRAR 🐯"}
      </Button>
      <div className="mt-4 grid grid-cols-6 gap-1 text-center text-xs">
        {SYMBOLS.map((s, i) => {
          const m = i === 5 ? 20 : i === 4 ? 10 : i === 3 ? 6 : i === 2 ? 4 : i === 1 ? 3 : 2;
          return (
            <div key={s} className="bg-secondary rounded p-1">
              <div className="text-lg">{s}</div>
              <div className="text-gold font-mono">x{m}</div>
            </div>
          );
        })}
      </div>
    </GameLayout>
  );
}
