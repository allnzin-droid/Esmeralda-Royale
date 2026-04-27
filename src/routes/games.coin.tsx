import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useBet } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/coin")({ component: Coin });

function Coin() {
  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState<"H" | "T">("H");
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<"H" | "T" | null>(null);
  const { placeBet, payout } = useBet("Cara/Coroa");

  const flip = () => {
    if (!placeBet(bet)) return;
    setFlipping(true);
    setResult(null);
    setTimeout(() => {
      // 49% chance for picked side (slight house edge)
      const r = Math.random() < 0.49 ? pick : pick === "H" ? "T" : "H";
      setResult(r);
      setFlipping(false);
      if (r === pick) {
        payout(bet * 1.95, "Cara/Coroa x1.95");
        toast.success(`Acertou! +${(bet * 1.95).toFixed(2)}`);
      } else {
        toast.error("Errou.");
      }
    }, 1500);
  };

  return (
    <GameLayout title="Cara ou Coroa" description="Acerto paga 1.95x." bet={bet} setBet={setBet} disabled={flipping}>
      <div className="grid place-items-center mb-6">
        <div
          className={`h-32 w-32 rounded-full bg-gradient-gold grid place-items-center font-display text-5xl shadow-gold border-4 border-gold`}
          style={flipping ? { animation: "coin-flip 1.5s ease-out" } : undefined}
        >
          {result === "H" ? "👑" : result === "T" ? "🦅" : "?"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button variant={pick === "H" ? "default" : "outline"} onClick={() => setPick("H")} className={pick === "H" ? "bg-gradient-gold" : "border-gold/30"}>👑 Cara</Button>
        <Button variant={pick === "T" ? "default" : "outline"} onClick={() => setPick("T")} className={pick === "T" ? "bg-gradient-gold" : "border-gold/30"}>🦅 Coroa</Button>
      </div>
      <Button onClick={flip} disabled={flipping} className="w-full bg-gradient-emerald shadow-emerald h-12">{flipping ? "Girando..." : "Lançar"}</Button>
    </GameLayout>
  );
}
