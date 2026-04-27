import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useBet, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/roulette")({ component: Roulette });

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
type Pick = { type: "color"; value: "red" | "black" } | { type: "number"; value: number } | { type: "parity"; value: "even" | "odd" };

function Roulette() {
  const [bet, setBet] = useState(10);
  const { placeBet, payout } = useBet("Roleta");
  const [pick, setPick] = useState<Pick>({ type: "color", value: "red" });
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [num, setNum] = useState(0);

  const spin = async () => {
    if (!placeBet(bet)) return;
    setSpinning(true);
    setResult(null);
    const final = randomInt(0, 36);
    const start = Date.now();
    const dur = 2000;
    const tick = () => {
      const t = Date.now() - start;
      if (t < dur) {
        setNum(randomInt(0, 36));
        requestAnimationFrame(tick);
      } else {
        setNum(final);
        setResult(final);
        setSpinning(false);
        let mult = 0;
        if (pick.type === "color") {
          const isRed = REDS.has(final);
          if ((pick.value === "red" && isRed) || (pick.value === "black" && !isRed && final !== 0)) mult = 2;
        } else if (pick.type === "parity") {
          if (final !== 0 && (pick.value === "even" ? final % 2 === 0 : final % 2 === 1)) mult = 2;
        } else if (pick.type === "number") {
          if (final === pick.value) mult = 35;
        }
        if (mult > 0) {
          payout(bet * mult, `Roleta x${mult}`);
          toast.success(`🎉 Saiu ${final}! Ganhou ${(bet * mult).toFixed(2)}`);
        } else {
          toast.error(`Saiu ${final}. Sem sorte.`);
        }
      }
    };
    tick();
  };

  const color = result !== null && REDS.has(result) ? "bg-destructive" : result === 0 ? "bg-success" : "bg-foreground text-background";

  return (
    <GameLayout title="Roleta" description="Vermelho/preto pagam 2x. Par/ímpar 2x. Número exato 35x." bet={bet} setBet={setBet} disabled={spinning}>
      <div className="grid place-items-center mb-6">
        <div className={`h-32 w-32 rounded-full grid place-items-center font-display text-5xl font-bold border-4 border-gold ${spinning ? "animate-spin-slow" : ""} ${result !== null ? color : "bg-secondary"}`}>
          {spinning ? num : result ?? "?"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Button variant={pick.type === "color" && pick.value === "red" ? "default" : "outline"} className={pick.type === "color" && pick.value === "red" ? "bg-destructive" : ""} onClick={() => setPick({ type: "color", value: "red" })}>Vermelho 2x</Button>
        <Button variant={pick.type === "color" && pick.value === "black" ? "default" : "outline"} onClick={() => setPick({ type: "color", value: "black" })}>Preto 2x</Button>
        <Button variant={pick.type === "parity" && pick.value === "even" ? "default" : "outline"} onClick={() => setPick({ type: "parity", value: "even" })}>Par 2x</Button>
        <Button variant={pick.type === "parity" && pick.value === "odd" ? "default" : "outline"} onClick={() => setPick({ type: "parity", value: "odd" })}>Ímpar 2x</Button>
      </div>
      <div className="text-xs text-muted-foreground mb-2">Ou escolha um número (35x):</div>
      <div className="grid grid-cols-7 sm:grid-cols-12 gap-1 mb-4">
        {Array.from({ length: 37 }, (_, i) => i).map((n) => (
          <button key={n} onClick={() => setPick({ type: "number", value: n })} className={`h-8 rounded text-xs font-mono ${pick.type === "number" && pick.value === n ? "ring-gold" : "border border-border"} ${REDS.has(n) ? "bg-destructive/70" : n === 0 ? "bg-success/70" : "bg-secondary"}`}>{n}</button>
        ))}
      </div>
      <Button onClick={spin} disabled={spinning} className="w-full bg-gradient-gold shadow-gold">{spinning ? "Girando..." : "Girar 🎰"}</Button>
    </GameLayout>
  );
}
