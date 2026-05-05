import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/tiger")({ component: Tiger });

const SYMBOLS = ["🐯", "🍊", "💰", "🏮", "🪙", "🐉"];
type TigerResult = { grid: number[]; lines: number[]; mult: number; win: number; balance: number };

const LINE_NAMES = ["Linha 1", "Linha 2", "Linha 3", "Diagonal ↘", "Diagonal ↙"];

function Tiger() {
  const [bet, setBet] = useState(10);
  const [grid, setGrid] = useState<string[]>(Array(9).fill(SYMBOLS[0]));
  const [hitLines, setHitLines] = useState<number[]>([]);
  const [spinning, setSpinning] = useState(false);
  const { validateBet, play } = usePlay();

  const spin = async () => {
    if (!validateBet(bet)) return;
    setSpinning(true);
    setHitLines([]);
    const res = await play<TigerResult>("play_tiger", { _bet: bet });
    if (!res) {
      setSpinning(false);
      return;
    }
    let ticks = 0;
    const iv = setInterval(() => {
      setGrid(Array.from({ length: 9 }, () => SYMBOLS[randomInt(0, SYMBOLS.length - 1)]));
      ticks++;
      if (ticks >= 14) {
        clearInterval(iv);
        const final = res.grid.map((i) => SYMBOLS[i]);
        setGrid(final);
        setHitLines(res.lines || []);
        setSpinning(false);
        if (res.win > 0) {
          const names = (res.lines || []).map((i) => LINE_NAMES[i]).join(", ");
          toast.success(`🐯 ${names} → x${res.mult} (+${Number(res.win).toFixed(2)})`);
        } else {
          toast.error("O tigre dormiu 😴");
        }
      }
    }, 90);
  };

  const cellHit = (idx: number) => {
    const winLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [2, 4, 6],
    ];
    return hitLines.some((l) => winLines[l].includes(idx));
  };

  return (
    <GameLayout title="Fortune Tiger" description="Grid 3x3. Vence em 3 linhas + 2 diagonais." bet={bet} setBet={setBet} disabled={spinning}>
      <div className="rounded-2xl bg-gradient-to-br from-amber-950/60 to-red-950/60 border-2 border-gold/60 p-6 mb-6 shadow-gold">
        <div className="text-center mb-3 font-display text-2xl text-gold glow-gold">🐯 福 TIGRE DA SORTE 福 🐯</div>
        <div className="grid grid-cols-3 gap-2">
          {grid.map((s, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl bg-gradient-to-br from-yellow-700 to-red-800 grid place-items-center text-5xl shadow-emerald border-2 ${
                cellHit(i) ? "border-gold ring-2 ring-gold animate-pulse" : "border-gold/40"
              } ${spinning ? "animate-pulse" : ""}`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
      <Button onClick={spin} disabled={spinning} className="w-full bg-gradient-gold shadow-gold h-12 text-lg">
        {spinning ? "Girando..." : "GIRAR 🐯"}
      </Button>
      <div className="mt-4 text-xs text-muted-foreground text-center">
        Linhas vencedoras: 3 horizontais + 2 diagonais (↘ ↙)
      </div>
    </GameLayout>
  );
}
