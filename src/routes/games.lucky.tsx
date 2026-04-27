import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useBet, randomInt } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/lucky")({ component: Lucky });

function Lucky() {
  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const { placeBet, payout } = useBet("Número da Sorte");

  const roll = () => {
    if (pick === null) return toast.error("Escolha um número de 1 a 10");
    if (!placeBet(bet)) return;
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      const r = randomInt(1, 10);
      setResult(r);
      setRolling(false);
      if (r === pick) {
        payout(bet * 9, "Número da Sorte x9");
        toast.success(`🎯 Acertou ${r}! Ganhou ${(bet * 9).toFixed(2)}`);
      } else {
        toast.error(`Saiu ${r}. Era ${pick}.`);
      }
    }, 1200);
  };

  return (
    <GameLayout title="Número da Sorte" description="Escolha 1-10. Acerto paga 9x." bet={bet} setBet={setBet} disabled={rolling}>
      <div className="grid grid-cols-5 gap-2 mb-6">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setPick(n)} disabled={rolling} className={`aspect-square rounded-xl text-2xl font-display font-bold transition ${pick === n ? "bg-gradient-gold ring-gold" : "bg-secondary hover:bg-secondary/70 border border-border"}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="text-center mb-6">
        <div className={`inline-block h-24 w-24 rounded-2xl bg-card border-2 border-gold/40 grid place-items-center font-display text-4xl text-gold ${rolling ? "animate-pulse" : ""}`}>
          {rolling ? "?" : result ?? "—"}
        </div>
      </div>
      <Button onClick={roll} disabled={rolling || pick === null} className="w-full bg-gradient-gold shadow-gold">
        {rolling ? "Sorteando..." : "Sortear"}
      </Button>
    </GameLayout>
  );
}
