import { useHistory } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";

export function HistoryDialog() {
  const { user } = useAuth();
  const all = useHistory();
  const mine = user ? all.filter((h) => h.userId === user.id) : [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
          <History className="h-4 w-4 mr-1" /> Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-gold/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-gold">Seu histórico</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[420px] pr-3">
          {mine.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sem movimentações ainda.</p>}
          <ul className="space-y-2">
            {mine.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm">
                <div>
                  <div className="font-medium capitalize">
                    {h.type === "bet" ? "Aposta" : h.type === "win" ? "Prêmio" : h.type === "deposit" ? "Depósito" : "Ajuste"}
                    {h.game && <span className="text-muted-foreground"> · {h.game}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</div>
                </div>
                <div className={`font-mono font-semibold ${h.amount >= 0 ? "text-success" : "text-destructive"}`}>
                  {h.amount >= 0 ? "+" : ""}{h.amount.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
