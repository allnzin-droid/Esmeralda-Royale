import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useBet } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/crash")({ component: Crash });

// Crash multiplier with house edge
function rollCrashPoint() {
  const r = Math.random();
  if (r < 0.03) return 1.0; // instant crash
  // Distribution biased toward low multipliers
  const e = 0.97; // house edge
  const x = e / (1 - r);
  return Math.max(1.0, +x.toFixed(2));
}

function Crash() {
  const [bet, setBet] = useState(10);
  const [mult, setMult] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [crashed, setCrashed] = useState<number | null>(null);
  const [cashedAt, setCashedAt] = useState<number | null>(null);
  const crashRef = useRef<number>(1);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const { placeBet, payout } = useBet("Crash");

  const start = () => {
    if (!placeBet(bet)) return;
    crashRef.current = rollCrashPoint();
    startRef.current = Date.now();
    setMult(1.0);
    setCrashed(null);
    setCashedAt(null);
    setRunning(true);
  };

  const cashOut = () => {
    if (!running) return;
    const m = mult;
    setCashedAt(m);
    setRunning(false);
    payout(bet * m, `Crash x${m.toFixed(2)}`);
    toast.success(`💸 Sacou em ${m.toFixed(2)}x → +${(bet * m).toFixed(2)}`);
  };

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const t = (Date.now() - startRef.current) / 1000;
      const m = +(Math.pow(1.06, t * 4)).toFixed(2);
      if (m >= crashRef.current) {
        setMult(crashRef.current);
        setCrashed(crashRef.current);
        setRunning(false);
        toast.error(`💥 Crash em ${crashRef.current.toFixed(2)}x`);
        return;
      }
      setMult(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const color = crashed ? "text-destructive" : cashedAt ? "text-success" : "text-gold";

  return (
    <GameLayout title="Crash" description="O multiplicador sobe... saque antes do crash!" bet={bet} setBet={setBet} disabled={running}>
      <div className={`relative h-56 rounded-2xl bg-background/50 border border-gold/30 grid place-items-center overflow-hidden ${crashed ? "animate-shake" : ""}`}>
        <div className={`font-display font-bold text-7xl ${color} glow-gold`}>{mult.toFixed(2)}x</div>
        {crashed && <div className="absolute inset-0 bg-destructive/20 grid place-items-center text-destructive font-display text-2xl">💥 CRASH</div>}
        {cashedAt && <div className="absolute top-2 right-2 text-success font-mono">+{(bet * cashedAt).toFixed(2)}</div>}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Button onClick={start} disabled={running} className="bg-gradient-emerald shadow-emerald h-12">Apostar</Button>
        <Button onClick={cashOut} disabled={!running} className="bg-gradient-gold shadow-gold h-12">Sacar {running && `(${(bet * mult).toFixed(2)})`}</Button>
      </div>
    </GameLayout>
  );
}
