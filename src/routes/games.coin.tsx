import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/coin")({ component: Coin });

type CoinResult = { result: "cara" | "coroa"; win: number; balance: number };

function Coin() {
  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState<"cara" | "coroa">("cara");
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<"cara" | "coroa" | null>(null);
  const { validateBet, play } = usePlay();

  const flip = async () => {
    if (!validateBet(bet)) return;
    setFlipping(true);
    setResult(null);
    const res = await play<CoinResult>("play_coin", { _bet: bet, _pick: pick });
    if (!res) {
      setFlipping(false);
      return;
    }
    setTimeout(() => {
      setResult(res.result);
      setFlipping(false);
      if (res.win > 0) toast.success(`Acertou! +${res.win.toFixed(2)}`);
      else toast.error("Errou.");
    }, 1500);
  };

  return (
    <GameLayout title="Cara ou Coroa" description="Acerto paga 2x." bet={bet} setBet={setBet} disabled={flipping}>
      <div className="grid place-items-center mb-6">
        <div
          className="h-32 w-32 rounded-full bg-gradient-gold grid place-items-center font-display text-5xl shadow-gold border-4 border-gold"
          style={flipping ? { animation: "coin-flip 1.5s ease-out" } : undefined}
        >
          {result === "cara" ? "👑" : result === "coroa" ? "🦅" : "?"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button variant={pick === "cara" ? "default" : "outline"} onClick={() => setPick("cara")} className={pick === "cara" ? "bg-gradient-gold" : "border-gold/30"} disabled={flipping}>👑 Cara</Button>
        <Button variant={pick === "coroa" ? "default" : "outline"} onClick={() => setPick("coroa")} className={pick === "coroa" ? "bg-gradient-gold" : "border-gold/30"} disabled={flipping}>🦅 Coroa</Button>
      </div>
      <Button onClick={flip} disabled={flipping} className="w-full bg-gradient-emerald shadow-emerald h-12">{flipping ? "Girando..." : "Lançar"}</Button>
    </GameLayout>
  );
}
