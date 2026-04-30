import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlay } from "@/lib/games";
import { toast } from "sonner";

export const Route = createFileRoute("/games/crash")({ component: Crash });

type CrashResult = { crash: number; cashout: number; win: number; balance: number };

function Crash() {
  const [bet, setBet] = useState(10);
  const [cashout, setCashout] = useState(2);
  const [mult, setMult] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [crashedAt, setCrashedAt] = useState<number | null>(null);
  const [wonAt, setWonAt] = useState<number | null>(null);
  const targetRef = useRef<number>(1);
  const cashoutRef = useRef<number>(2);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const { validateBet, play } = usePlay();

  const start = async () => {
    if (running) return;
    if (!validateBet(bet)) return;
    if (cashout < 1.01 || cashout > 100) {
      toast.error("Cash-out entre 1.01x e 100x");
      return;
    }
    setCrashedAt(null);
    setWonAt(null);
    setMult(1.0);
    const res = await play<CrashResult>("play_crash", { _bet: bet, _cashout: cashout });
    if (!res) return;
    targetRef.current = Number(res.crash);
    cashoutRef.current = Number(res.cashout);
    startRef.current = Date.now();
    setRunning(true);
    // After animation, reveal whether you cashed out (server-decided)
    setTimeout(() => {
      if (Number(res.win) > 0) {
        toast.success(`💸 Sacou em ${cashoutRef.current.toFixed(2)}x → +${Number(res.win).toFixed(2)}`);
      } else {
        toast.error(`💥 Crash em ${targetRef.current.toFixed(2)}x`);
      }
    }, 0);
  };

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const t = (Date.now() - startRef.current) / 1000;
      const m = +(Math.pow(1.06, t * 4)).toFixed(2);
      const target = targetRef.current;
      const co = cashoutRef.current;
      // Cashed out before crash?
      if (target >= co && m >= co) {
        setMult(co);
        setWonAt(co);
        setRunning(false);
        return;
      }
      if (m >= target) {
        setMult(target);
        setCrashedAt(target);
        setRunning(false);
        return;
      }
      setMult(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const color = crashedAt ? "text-destructive" : wonAt ? "text-success" : "text-gold";

  return (
    <GameLayout title="Crash" description="Defina o cash-out automático antes de apostar." bet={bet} setBet={setBet} disabled={running}>
      <div className={`relative h-56 rounded-2xl bg-background/50 border border-gold/30 grid place-items-center overflow-hidden ${crashedAt ? "animate-shake" : ""}`}>
        <div className={`font-display font-bold text-7xl ${color} glow-gold`}>{mult.toFixed(2)}x</div>
        {crashedAt && <div className="absolute inset-0 bg-destructive/20 grid place-items-center text-destructive font-display text-2xl">💥 CRASH</div>}
        {wonAt && <div className="absolute top-2 right-2 text-success font-mono">+{(bet * wonAt).toFixed(2)}</div>}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
        <div>
          <Label className="text-xs">Cash-out automático (x)</Label>
          <Input
            type="number"
            min={1.01}
            max={100}
            step={0.01}
            value={cashout}
            onChange={(e) => setCashout(Number(e.target.value))}
            disabled={running}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={start} disabled={running} className="w-full bg-gradient-emerald shadow-emerald h-10">
            {running ? "Rodando..." : "Apostar"}
          </Button>
        </div>
      </div>
    </GameLayout>
  );
}
