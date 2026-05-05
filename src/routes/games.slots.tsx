import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/slots")({ component: Slots });

const SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "⭐", "💎"];
type SlotsResult = { grid: number[]; lines: number[]; mult: number; win: number; balance: number };

const LINE_NAMES = ["Linha 1", "Linha 2", "Linha 3", "Diagonal ↘", "Diagonal ↙"];
const WIN_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [2, 4, 6]];

function Slots() {
  const [bet, setBet] = useState(10);
  const [grid, setGrid] = useState<string[]>(Array(9).fill(SYMBOLS[0]));
  const [hitLines, setHitLines] = useState<number[]>([]);
  const [spinning, setSpinning] = useState(false);
  const { validateBet, play } = usePlay();

  const spin = async () => {
    if (!validateBet(bet)) return;
    setSpinning(true);
    setHitLines([]);
    const res = await play<SlotsResult>("play_slots", { _bet: bet });
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
        setGrid(res.grid.map((i) => SYMBOLS[i]));
        setHitLines(res.lines || []);
        setSpinning(false);
        if (res.win > 0) {
          const names = (res.lines || []).map((i) => LINE_NAMES[i]).join(", ");
          toast.success(`🎰 ${names} → x${res.mult} (+${Number(res.win).toFixed(2)})`);
        } else {
          toast.error("Sem combinação 😞");
        }
      }
    }, 90);
  };

  return (
    <GameLayout title="Caça-Níqueis" description="Grid 3x3. Vence em 3 linhas + 2 diagonais." bet={bet} setBet={setBet} disabled={spinning}>
      <div className="rounded-2xl bg-background/60 border-2 border-gold/40 p-6 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {grid.map((s, i) => {
            const hit = hitLines.some((l) => WIN_LINES[l].includes(i));
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl bg-gradient-emerald grid place-items-center text-5xl shadow-emerald border-2 ${
                  hit ? "border-gold ring-2 ring-gold animate-pulse" : "border-transparent"
                } ${spinning ? "animate-pulse" : ""}`}
              >
                {s}
              </div>
            );
          })}
        </div>
      </div>
      <Button onClick={spin} disabled={spinning} className="w-full bg-gradient-gold shadow-gold h-12 text-lg">
        {spinning ? "Girando..." : "GIRAR 🎰"}
      </Button>
      <div className="mt-4 text-xs text-muted-foreground text-center">
        Linhas vencedoras: 3 horizontais + 2 diagonais (↘ ↙)
      </div>
    </GameLayout>
  );
}
