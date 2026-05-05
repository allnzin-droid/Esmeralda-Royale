import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay } from "@/lib/games";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/games/crash")({ component: Crash });

type StartResult = { round_id: string; balance: number };
type CashoutResult = { ok: boolean; crash_point: number; win: number; balance: number };

function Crash() {
  const [bet, setBet] = useState(10);
  const [mult, setMult] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [crashedAt, setCrashedAt] = useState<number | null>(null);
  const [wonAt, setWonAt] = useState<number | null>(null);
  const roundRef = useRef<string | null>(null);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const cashedRef = useRef<boolean>(false);
  const { validateBet, play } = usePlay();

  const start = async () => {
    if (running) return;
    if (!validateBet(bet)) return;
    setCrashedAt(null);
    setWonAt(null);
    setMult(1.0);
    cashedRef.current = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await play<StartResult>("crash_start" as any, { _bet: bet });
    if (!res) return;
    roundRef.current = res.round_id;
    startRef.current = Date.now();
    setRunning(true);
  };

  const cashout = async () => {
    if (!running || cashedRef.current || !roundRef.current) return;
    cashedRef.current = true;
    const at = +mult.toFixed(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc("crash_cashout" as any, {
      _round_id: roundRef.current,
      _at_mult: at,
    } as any);
    if (error) {
      cashedRef.current = false;
      toast.error("Falha no saque: " + error.message);
      return;
    }
    const r = data as CashoutResult;
    if (r.ok) {
      setWonAt(at);
      setRunning(false);
      toast.success(`💸 Sacou em ${at.toFixed(2)}x → +${r.win.toFixed(2)}`);
    } else {
      setCrashedAt(r.crash_point);
      setRunning(false);
      toast.error(`💥 Tarde demais! Crash em ${r.crash_point.toFixed(2)}x`);
    }
  };

  useEffect(() => {
    if (!running) return;
    const tick = async () => {
      const t = (Date.now() - startRef.current) / 1000;
      const m = +Math.pow(1.06, t * 4).toFixed(2);
      setMult(m);
      // Tenta sacar a cada frame: se ainda não crashou, ganha; se crashou antes, perde.
      // Mas para detectar o crash, validamos remotamente em intervalos.
      if (m >= 100) {
        // safety stop
        setRunning(false);
        return;
      }
      // Verifica crash a cada ~150ms
      if (Math.floor(t * 1000) % 150 < 30 && roundRef.current && !cashedRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await supabase.rpc("crash_reveal" as any, { _round_id: roundRef.current } as any);
        const cp = Number((data as { crash_point: number } | null)?.crash_point ?? 0);
        if (cp && m >= cp) {
          setMult(cp);
          setCrashedAt(cp);
          setRunning(false);
          toast.error(`💥 Crash em ${cp.toFixed(2)}x`);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  const color = crashedAt ? "text-destructive" : wonAt ? "text-success" : "text-gold";

  return (
    <GameLayout title="Crash" description="Aperte SACAR antes do avião explodir!" bet={bet} setBet={setBet} disabled={running}>
      <div
        className={`relative h-56 rounded-2xl bg-background/50 border border-gold/30 grid place-items-center overflow-hidden ${
          crashedAt ? "animate-shake" : ""
        }`}
      >
        <div className={`font-display font-bold text-7xl ${color} glow-gold`}>{mult.toFixed(2)}x</div>
        {crashedAt && (
          <div className="absolute inset-0 bg-destructive/20 grid place-items-center text-destructive font-display text-2xl">
            💥 CRASH
          </div>
        )}
        {wonAt && <div className="absolute top-2 right-2 text-success font-mono">+{(bet * wonAt).toFixed(2)}</div>}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {!running ? (
          <>
            <Button onClick={start} className="col-span-2 bg-gradient-emerald shadow-emerald h-12 text-lg">
              ✈️ Apostar e decolar
            </Button>
          </>
        ) : (
          <>
            <Button disabled className="bg-secondary h-12">
              Possível ganho: {(bet * mult).toFixed(2)}
            </Button>
            <Button onClick={cashout} className="bg-gradient-gold shadow-gold h-12 text-lg animate-pulse">
              💸 SACAR {mult.toFixed(2)}x
            </Button>
          </>
        )}
      </div>
    </GameLayout>
  );
}
