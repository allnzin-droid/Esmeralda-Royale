import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { usePlay } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/games/horses")({ component: Horses });

type Room = { id: string; status: string; winner: number | null; created_at: string };
type Bet = { user_id: string; user_email: string | null; horse: number; bet: number; win: number };

const HORSE_NAMES = ["🟥 1", "🟧 2", "🟨 3", "🟩 4", "🟦 5", "🟪 6"];

function Horses() {
  const { user } = useAuth();
  const [bet, setBet] = useState(10);
  const [horse, setHorse] = useState(1);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [busy, setBusy] = useState(false);
  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [takenHorses, setTakenHorses] = useState<number[]>([]);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const join = async () => {
    if (busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc("horse_join" as any, { _bet: bet, _horse: horse } as any);
    setBusy(false);
    if (error) {
      if (error.message.includes("horse_taken")) {
        toast.error("Esse cavalo já foi escolhido. Escolha outro.");
        setTakenHorses((t) => (t.includes(horse) ? t : [...t, horse]));
      } else {
        toast.error(error.message);
      }
      return;
    }
    const r = data as { room_id: string };
    setRoomId(r.room_id);
    toast.success(`Entrou na sala — cavalo ${horse}`);
  };

  // Pré-lobby: descobre quais cavalos já estão escolhidos na sala em espera mais antiga
  useEffect(() => {
    if (roomId) return;
    let active = true;
    const loadTaken = async () => {
      const { data: rooms } = await supabase
        .from("horse_rooms")
        .select("id")
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(1);
      const rid = rooms?.[0]?.id;
      if (!rid) {
        if (active) setTakenHorses([]);
        return;
      }
      const { data: b } = await supabase.from("horse_bets").select("horse").eq("room_id", rid);
      if (active) setTakenHorses((b ?? []).map((x: { horse: number }) => x.horse));
    };
    loadTaken();
    const ch = supabase
      .channel("horse-lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "horse_bets" }, loadTaken)
      .on("postgres_changes", { event: "*", schema: "public", table: "horse_rooms" }, loadTaken)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  // Realtime para sala atual
  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const { data: r } = await supabase.from("horse_rooms").select("*").eq("id", roomId).maybeSingle();
      if (r) setRoom(r as Room);
      const { data: b } = await supabase.from("horse_bets").select("*").eq("room_id", roomId);
      if (b) setBets(b as Bet[]);
    };
    load();
    const ch = supabase
      .channel(`horse-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "horse_rooms", filter: `id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "horse_bets", filter: `room_id=eq.${roomId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  // tick: força resolução de salas vencidas
  useEffect(() => {
    if (!roomId || room?.status === "finished") return;
    tickRef.current = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.rpc("horse_tick" as any).then(() => {});
    }, 5000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [roomId, room?.status]);

  // animação corrida quando racing/finished
  useEffect(() => {
    if (room?.status !== "racing" && room?.status !== "finished") {
      setPositions([0, 0, 0, 0, 0, 0]);
      return;
    }
    const winner = room?.winner ?? Math.ceil(Math.random() * 6);
    let frame = 0;
    const total = 60;
    const iv = setInterval(() => {
      frame++;
      setPositions((p) =>
        p.map((_, i) => {
          const speed = i + 1 === winner ? 1.0 : 0.6 + Math.random() * 0.3;
          return Math.min(100, (frame / total) * 100 * speed);
        }),
      );
      if (frame >= total) clearInterval(iv);
    }, 80);
    return () => clearInterval(iv);
  }, [room?.status, room?.winner]);

  const reset = () => {
    setRoomId(null);
    setRoom(null);
    setBets([]);
  };

  const myBet = bets.find((b) => b.user_id === user?.id);
  const isWaiting = room?.status === "waiting";
  const elapsed = room ? Math.floor((Date.now() - new Date(room.created_at).getTime()) / 1000) : 0;

  return (
    <GameLayout
      title="Corrida de Cavalos"
      description="🐎 Multi 2-6. Ganhador leva 65% do pote. Auto-start em 30s."
      bet={bet}
      setBet={setBet}
      disabled={busy || !!roomId}
      historyGame="Cavalos"
    >
      {!roomId ? (
        <>
          <div className="mb-4 text-sm text-muted-foreground">Escolha seu cavalo:</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {HORSE_NAMES.map((n, i) => {
              const taken = takenHorses.includes(i + 1);
              return (
                <Button
                  key={i}
                  variant={horse === i + 1 ? "default" : "outline"}
                  onClick={() => !taken && setHorse(i + 1)}
                  disabled={taken}
                  className={
                    taken
                      ? "opacity-50 cursor-not-allowed border-border"
                      : horse === i + 1
                        ? "bg-gradient-gold"
                        : "border-gold/30"
                  }
                >
                  {n} {taken && "🔒"}
                </Button>
              );
            })}
          </div>
          {takenHorses.includes(horse) && (
            <p className="text-xs text-destructive mb-2">Esse cavalo já foi escolhido. Selecione outro.</p>
          )}
          <Button
            onClick={join}
            disabled={busy || takenHorses.includes(horse)}
            className="w-full bg-gradient-emerald shadow-emerald h-12"
          >
            🐎 Entrar na corrida (R$ {bet.toFixed(2)})
          </Button>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Sala #{roomId.slice(0, 6)} · {bets.length}/6 jogadores
            </span>
            <span className="text-sm text-gold">
              {isWaiting ? `⏱ ${Math.max(0, 30 - elapsed)}s` : room?.status === "racing" ? "🏁 Correndo!" : "✅ Fim"}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {HORSE_NAMES.map((n, i) => {
              const horseBets = bets.filter((b) => b.horse === i + 1);
              const isWinner = room?.winner === i + 1;
              return (
                <div key={i} className={`relative h-10 rounded-lg bg-secondary/50 border ${isWinner ? "border-gold ring-1 ring-gold" : "border-border"} overflow-hidden`}>
                  <div
                    className="absolute top-0 bottom-0 left-0 transition-all duration-200 bg-gradient-to-r from-emerald-700/40 to-gold/40"
                    style={{ width: `${positions[i]}%` }}
                  />
                  <div className="relative h-full px-3 flex items-center justify-between text-sm">
                    <span className="font-display">{n} 🐎</span>
                    <span className="text-xs text-muted-foreground">
                      {horseBets.length > 0 ? horseBets.map((b) => b.user_email?.split("@")[0]).join(", ") : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {room?.status === "finished" && (
            <div className="text-center mb-4">
              {myBet && myBet.win > 0 ? (
                <div className="text-success font-display text-xl">🏆 Ganhou R$ {myBet.win.toFixed(2)}!</div>
              ) : (
                <div className="text-muted-foreground">Cavalo {room.winner} venceu. Mais sorte na próxima!</div>
              )}
              <Button onClick={reset} className="mt-3 bg-gradient-gold shadow-gold">Nova corrida</Button>
            </div>
          )}
        </>
      )}
    </GameLayout>
  );
}
