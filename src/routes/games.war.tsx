import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/games/war")({ component: War });

type Room = { id: string; status: string; winning_card: number | null; created_at: string };
type Bet = { user_id: string; user_email: string | null; bet: number; card: number | null; win: number };

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function War() {
  const { user } = useAuth();
  const [bet, setBet] = useState(10);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [busy, setBusy] = useState(false);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const join = async () => {
    if (busy) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc("war_join" as any, { _bet: bet } as any);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const r = data as { room_id: string };
    setRoomId(r.room_id);
    toast.success("Entrou na mesa");
  };

  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const { data: r } = await supabase.from("war_rooms").select("*").eq("id", roomId).maybeSingle();
      if (r) setRoom(r as Room);
      const { data: b } = await supabase.from("war_bets").select("*").eq("room_id", roomId);
      if (b) setBets(b as Bet[]);
    };
    load();
    const ch = supabase
      .channel(`war-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "war_rooms", filter: `id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "war_bets", filter: `room_id=eq.${roomId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || room?.status === "finished") return;
    tickRef.current = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.rpc("war_tick" as any).then(() => {});
    }, 5000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [roomId, room?.status]);

  const reset = () => {
    setRoomId(null);
    setRoom(null);
    setBets([]);
  };

  const myBet = bets.find((b) => b.user_id === user?.id);
  const isWaiting = room?.status === "waiting";
  const elapsed = room ? Math.floor((Date.now() - new Date(room.created_at).getTime()) / 1000) : 0;
  const pot = bets.reduce((s, b) => s + Number(b.bet), 0);

  const renderCard = (card: number | null, idx: number) => {
    if (!card) return <span className="text-2xl">🂠</span>;
    const rank = RANKS[card - 1];
    const suit = SUITS[idx % 4];
    const red = suit === "♥" || suit === "♦";
    return (
      <div className={`inline-flex flex-col items-center justify-center w-12 h-16 rounded-md bg-white border-2 border-gold/50 ${red ? "text-red-600" : "text-black"} font-bold`}>
        <span className="text-lg leading-none">{rank}</span>
        <span className="text-xl leading-none">{suit}</span>
      </div>
    );
  };

  return (
    <GameLayout title="Guerra de Cartas" description="🃏 Multi 2-6. Carta mais alta divide 90% do pote. Auto-start em 30s." bet={bet} setBet={setBet} disabled={busy || !!roomId}>
      {!roomId ? (
        <Button onClick={join} disabled={busy} className="w-full bg-gradient-emerald shadow-emerald h-12">
          🃏 Entrar na mesa (R$ {bet.toFixed(2)})
        </Button>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Mesa #{roomId.slice(0, 6)} · {bets.length}/6 · Pote R$ {pot.toFixed(2)}
            </span>
            <span className="text-sm text-gold">
              {isWaiting ? `⏱ ${Math.max(0, 30 - elapsed)}s` : room?.status === "racing" ? "🃏 Distribuindo..." : "✅ Fim"}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {bets.map((b, i) => {
              const isWinner = room?.status === "finished" && b.card === room?.winning_card;
              const isMe = b.user_id === user?.id;
              return (
                <div key={b.user_id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${isWinner ? "border-gold bg-gold/10" : "border-border bg-secondary/40"}`}>
                  <div className="flex-1">
                    <div className="text-sm">{isMe ? "Você" : b.user_email?.split("@")[0]}</div>
                    <div className="text-xs text-muted-foreground">R$ {Number(b.bet).toFixed(2)}</div>
                  </div>
                  {renderCard(b.card, i)}
                  {isWinner && <span className="text-success font-display text-sm">🏆 +{Number(b.win).toFixed(2)}</span>}
                </div>
              );
            })}
          </div>
          {room?.status === "finished" && (
            <div className="text-center">
              {myBet && myBet.win > 0 ? (
                <div className="text-success font-display text-xl">🏆 Ganhou R$ {Number(myBet.win).toFixed(2)}!</div>
              ) : (
                <div className="text-muted-foreground">Maior carta: {room.winning_card ? RANKS[room.winning_card - 1] : "—"}</div>
              )}
              <Button onClick={reset} className="mt-3 bg-gradient-gold shadow-gold">Nova mesa</Button>
            </div>
          )}
        </>
      )}
    </GameLayout>
  );
}
