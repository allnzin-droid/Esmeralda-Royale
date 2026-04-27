import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, TrendingDown } from "lucide-react";

type Round = {
  id: string;
  createdAt: number;
  bet: number;
  win: number;
  net: number;
  note?: string;
};

export function GameHistory({ game }: { game: string }) {
  const { user } = useAuth();
  const all = useHistory();

  const rounds = useMemo<Round[]>(() => {
    if (!user) return [];
    // Apenas entradas deste jogo, deste usuário, em ordem cronológica
    const entries = all
      .filter((h) => h.userId === user.id && h.game === game && (h.type === "bet" || h.type === "win"))
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt);

    const result: Round[] = [];
    for (const e of entries) {
      if (e.type === "bet") {
        result.push({
          id: e.id,
          createdAt: e.createdAt,
          bet: Math.abs(e.amount),
          win: 0,
          net: e.amount,
          note: e.note,
        });
      } else {
        // Liga este ganho à última aposta sem ganho associado (mesma rodada)
        const last = [...result].reverse().find((r) => r.win === 0);
        if (last) {
          last.win = e.amount;
          last.net = +(last.net + e.amount).toFixed(2);
          last.note = e.note ?? last.note;
        } else {
          result.push({
            id: e.id,
            createdAt: e.createdAt,
            bet: 0,
            win: e.amount,
            net: e.amount,
            note: e.note,
          });
        }
      }
    }
    return result.reverse().slice(0, 50);
  }, [all, user, game]);

  const stats = useMemo(() => {
    const plays = rounds.length;
    const wins = rounds.filter((r) => r.net > 0).length;
    const totalNet = +rounds.reduce((s, r) => s + r.net, 0).toFixed(2);
    return { plays, wins, totalNet, rate: plays ? Math.round((wins / plays) * 100) : 0 };
  }, [rounds]);

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gold">
          <History className="h-4 w-4" />
          <span className="font-display text-sm">Histórico de jogadas</span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{stats.plays} jogadas</span>
          <span>· {stats.rate}% vitórias</span>
          <span className={stats.totalNet >= 0 ? "text-success" : "text-destructive"}>
            · {stats.totalNet >= 0 ? "+" : ""}
            {stats.totalNet.toFixed(2)}
          </span>
        </div>
      </div>

      {rounds.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Nenhuma jogada ainda. Faça sua primeira aposta!
        </p>
      ) : (
        <ScrollArea className="h-48 pr-2">
          <ul className="space-y-1.5">
            {rounds.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {r.net >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-mono">
                      Aposta {r.bet.toFixed(2)} → Retorno {r.win.toFixed(2)}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {r.note ?? "—"} · {new Date(r.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div
                  className={`font-mono font-semibold ml-2 ${
                    r.net >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {r.net >= 0 ? "+" : ""}
                  {r.net.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
