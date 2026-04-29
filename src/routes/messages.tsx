import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDeposits, useWithdrawals } from "@/lib/hooks";
import { addDepositMessage, addWithdrawMessage, type DepositRequest, type WithdrawRequest } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestThread } from "@/components/RequestThread";
import { ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400",
    awaiting_payment: "bg-blue-500/20 text-blue-400",
    approved: "bg-success/20 text-success",
    rejected: "bg-destructive/20 text-destructive",
  };
  const label: Record<string, string> = {
    pending: "Pendente",
    awaiting_payment: "Aguardando pagamento",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[status]}`}>{label[status] || status}</span>;
}

function MessagesPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const deposits = useDeposits();
  const withdrawals = useWithdrawals();

  const { loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);
  if (!user) return null;

  const myDeps = deposits.filter((d) => d.userId === user.id);
  const myWits = withdrawals.filter((w) => w.userId === user.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary glow-gold">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seus pedidos e converse com o admin</p>
      </div>

      <Tabs defaultValue="deposits">
        <TabsList>
          <TabsTrigger value="deposits">Depósitos ({myDeps.length})</TabsTrigger>
          <TabsTrigger value="withdrawals">Saques ({myWits.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="deposits" className="space-y-3 mt-4">
          {myDeps.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não tem pedidos de depósito.</p>}
          {myDeps.map((d) => <DepositItem key={d.id} d={d} />)}
        </TabsContent>
        <TabsContent value="withdrawals" className="space-y-3 mt-4">
          {myWits.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não tem pedidos de saque.</p>}
          {myWits.map((w) => <WithdrawItem key={w.id} w={w} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DepositItem({ d }: { d: DepositRequest }) {
  const [open, setOpen] = useState(d.status !== "approved" && d.status !== "rejected");
  return (
    <Card className="border-primary/20 bg-card/80">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between text-left">
        <div>
          <div className="font-medium flex items-center gap-2">Depósito de {d.amount} moedas <StatusPill status={d.status} /></div>
          <div className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</div>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
          {d.pixKey && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">Chave PIX para pagamento:</div>
              <div className="font-mono text-primary break-all">{d.pixKey}</div>
              <p className="text-xs text-muted-foreground mt-2">Após pagar, envie o comprovante abaixo.</p>
            </div>
          )}
          <RequestThread
            messages={d.messages || []}
            from="user"
            onSend={(m) => addDepositMessage(d.id, { from: "user", ...m })}
            placeholder="Envie comprovante ou mensagem ao admin…"
          />
        </div>
      )}
    </Card>
  );
}

function WithdrawItem({ w }: { w: WithdrawRequest }) {
  const [open, setOpen] = useState(w.status === "pending");
  return (
    <Card className="border-primary/20 bg-card/80">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between text-left">
        <div>
          <div className="font-medium flex items-center gap-2">Saque de {w.amount} moedas <StatusPill status={w.status} /></div>
          <div className="text-xs text-muted-foreground">PIX: {w.pixKey} · {new Date(w.createdAt).toLocaleString()}</div>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          <RequestThread
            messages={w.messages || []}
            from="user"
            onSend={(m) => addWithdrawMessage(w.id, { from: "user", ...m })}
            placeholder="Mensagem ao admin…"
          />
        </div>
      )}
    </Card>
  );
}
