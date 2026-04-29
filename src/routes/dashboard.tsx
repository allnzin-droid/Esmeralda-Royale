import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { DepositDialog } from "@/components/DepositDialog";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import { HistoryDialog } from "@/components/HistoryDialog";
import { GameGrid } from "@/components/GameGrid";
import { Button } from "@/components/ui/button";
import { useDeposits, useWithdrawals } from "@/lib/hooks";
import { Coins, Sparkles, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const deposits = useDeposits();
  const withdrawals = useWithdrawals();

  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);
  if (!user) return null;

  const myPendingDep = deposits.filter((d) => d.userId === user.id && (d.status === "pending" || d.status === "awaiting_payment"));
  const myPendingWit = withdrawals.filter((w) => w.userId === user.id && w.status === "pending");
  const totalPending = myPendingDep.length + myPendingWit.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="rounded-3xl bg-gradient-emerald shadow-emerald p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-primary-foreground/80">Olá, {user.name}</p>
          <div className="mt-2 flex items-end gap-3">
            <Coins className="h-10 w-10 text-gold" />
            <div className="font-display text-5xl md:text-6xl text-gold glow-gold font-bold">
              {user.balance.toFixed(2)}
            </div>
            <div className="text-sm text-primary-foreground/80 mb-2">moedas</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <DepositDialog />
            <WithdrawDialog />
            <HistoryDialog />
            <Button asChild variant="outline" className="border-gold/40 text-gold hover:bg-gold/10">
              <Link to="/messages">
                <MessageSquare className="h-4 w-4 mr-1" /> Mensagens
                {totalPending > 0 && <span className="ml-2 rounded-full bg-gold text-gold-foreground px-2 text-xs">{totalPending}</span>}
              </Link>
            </Button>
          </div>
          {totalPending > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background/30 px-3 py-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              {totalPending} pedido(s) aguardando
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-gold mb-4">Jogos</h2>
        <GameGrid />
      </section>
    </div>
  );
}
