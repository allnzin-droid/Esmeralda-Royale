import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/roulette")({ component: Roulette });

type Pick =
  | { type: "color"; value: "red" | "black" }
  | { type: "number"; value: number }
  | { type: "parity"; value: "par" | "impar" };

type RouletteResult = { number: number; color: "red" | "black" | "green"; win: number; balance: number };

function Roulette() {
  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState<Pick>({ type: "color", value: "red" });
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [num, setNum] = useState(0);
  const { validateBet, play } = usePlay();

  const spin = async () => {
    if (!validateBet(bet)) return;
    setSpinning(true);
    setResult(null);

    const args: Record<string, unknown> =
      pick.type === "number"
        ? { _bet: bet, _kind: "number", _value: String(pick.value) }
        : pick.type === "color"
          ? { _bet: bet, _kind: "color", _value: pick.value === "red" ? "red" : "black" }
          : { _bet: bet, _kind: "parity", _value: pick.value };

    const res = await play<RouletteResult>("play_roulette", args);
    if (!res) {
      setSpinning(false);
      return;
    }

    const start = Date.now();
    const dur = 2000;
    const tick = () => {
      const t = Date.now() - start;
      if (t < dur) {
        setNum(randomInt(0, 36));
        requestAnimationFrame(tick);
      } else {
        setNum(res.number);
        setResult(res.number);
        setSpinning(false);
        if (res.win > 0) toast.success(`🎉 Saiu ${res.number}! Ganhou ${res.win.toFixed(2)}`);
        else toast.error(`Saiu ${res.number}. Sem sorte.`);
      }
    };
    tick();
  };

  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const color = result !== null && REDS.has(result) ? "bg-destructive" : result === 0 ? "bg-success" : "bg-foreground text-background";

  return (
    <GameLayout title="Roleta" description="Cor 2x. Par/ímpar 1x (devolve a aposta). Número exato 35x." bet={bet} setBet={setBet} disabled={spinning}>
      <div className="grid place-items-center mb-6">
        <div className={`h-32 w-32 rounded-full grid place-items-center font-display text-5xl font-bold border-4 border-gold ${spinning ? "animate-spin-slow" : ""} ${result !== null ? color : "bg-secondary"}`}>
          {spinning ? num : result ?? "?"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Button variant={pick.type === "color" && pick.value === "red" ? "default" : "outline"} className={pick.type === "color" && pick.value === "red" ? "bg-destructive" : ""} onClick={() => setPick({ type: "color", value: "red" })} disabled={spinning}>Vermelho 2x</Button>
        <Button variant={pick.type === "color" && pick.value === "black" ? "default" : "outline"} onClick={() => setPick({ type: "color", value: "black" })} disabled={spinning}>Preto 2x</Button>
        <Button variant={pick.type === "parity" && pick.value === "par" ? "default" : "outline"} onClick={() => setPick({ type: "parity", value: "par" })} disabled={spinning}>Par 1x</Button>
        <Button variant={pick.type === "parity" && pick.value === "impar" ? "default" : "outline"} onClick={() => setPick({ type: "parity", value: "impar" })} disabled={spinning}>Ímpar 1x</Button>
      </div>
      <div className="text-xs text-muted-foreground mb-2">Ou escolha um número (35x):</div>
      <div className="grid grid-cols-7 sm:grid-cols-12 gap-1 mb-4">
        {Array.from({ length: 37 }, (_, i) => i).map((n) => (
          <button key={n} onClick={() => setPick({ type: "number", value: n })} disabled={spinning} className={`h-8 rounded text-xs font-mono ${pick.type === "number" && pick.value === n ? "ring-gold" : "border border-border"} ${REDS.has(n) ? "bg-destructive/70" : n === 0 ? "bg-success/70" : "bg-secondary"}`}>{n}</button>
        ))}
      </div>
      <Button onClick={spin} disabled={spinning} className="w-full bg-gradient-gold shadow-gold">{spinning ? "Girando..." : "Girar 🎰"}</Button>
    </GameLayout>
  );
}
