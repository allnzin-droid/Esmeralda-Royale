import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDeposits, useUsers, useWithdrawals } from "@/lib/hooks";
import {
  store,
  adjustBalance,
  addDepositMessage,
  addWithdrawMessage,
  adminPin,
  type DepositRequest,
  type WithdrawRequest,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { RequestThread } from "@/components/RequestThread";
import { AdminPinGate, useAdminConfirm } from "@/components/AdminPinGate";
import { toast } from "sonner";
import { Check, X, Coins, ChevronDown, ChevronUp, KeyRound, ShieldCheck, ShieldAlert, Lock } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const users = useUsers();
  const deposits = useDeposits();
  const withdrawals = useWithdrawals();

  useEffect(() => {
    if (!user) nav({ to: "/auth" });
    else if (!isAdmin) nav({ to: "/dashboard" });
  }, [user, isAdmin, nav]);
  if (!user || !isAdmin) return null;

  const pendingDep = deposits.filter((d) => d.status === "pending" || d.status === "awaiting_payment");
  const pendingWit = withdrawals.filter((w) => w.status === "pending");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-primary glow-gold">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Gerencie depósitos, saques e usuários</p>
        </div>
        <AdminPinStatus />
      </div>

      <Tabs defaultValue="deposits">
        <TabsList>
          <TabsTrigger value="deposits">
            Depósitos {pendingDep.length > 0 && <Badge n={pendingDep.length} />}
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            Saques {pendingWit.length > 0 && <Badge n={pendingWit.length} />}
          </TabsTrigger>
          <TabsTrigger value="users">Usuários ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="space-y-3 mt-4">
          {deposits.length === 0 && <p className="text-muted-foreground text-sm">Nenhum pedido de depósito.</p>}
          {deposits.map((d) => <DepositCard key={d.id} d={d} />)}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-3 mt-4">
          {withdrawals.length === 0 && <p className="text-muted-foreground text-sm">Nenhum pedido de saque.</p>}
          {withdrawals.map((w) => <WithdrawCard key={w.id} w={w} />)}
        </TabsContent>

        <TabsContent value="users" className="space-y-3 mt-4">
          {users.map((u) => (
            <UserRow key={u.id} userId={u.id} email={u.email} name={u.name} balance={u.balance} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Badge = ({ n }: { n: number }) => (
  <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 text-xs">{n}</span>
);

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

function DepositCard({ d }: { d: DepositRequest }) {
  const [open, setOpen] = useState(d.status === "pending" || d.status === "awaiting_payment");
  const [pixKey, setPixKey] = useState(d.pixKey || "");

  const sendPix = () => {
    if (!pixKey.trim()) return toast.error("Informe a chave PIX");
    const list = store.getDeposits();
    const i = list.findIndex((x) => x.id === d.id);
    if (i === -1) return;
    list[i].pixKey = pixKey.trim();
    list[i].status = "awaiting_payment";
    store.setDeposits(list);
    addDepositMessage(d.id, { from: "admin", text: `Chave PIX para pagamento: ${pixKey.trim()}` });
    toast.success("Chave PIX enviada ao usuário");
  };

  const approve = () => {
    const list = store.getDeposits();
    const i = list.findIndex((x) => x.id === d.id);
    if (i === -1) return;
    list[i].status = "approved";
    list[i].resolvedAt = Date.now();
    store.setDeposits(list);
    adjustBalance(d.userId, d.amount, { type: "deposit", note: `Depósito #${d.id.slice(0, 6)}` });
    addDepositMessage(d.id, { from: "admin", text: `Depósito aprovado. ${d.amount} moedas creditadas.` });
    toast.success(`+${d.amount} para ${d.userEmail}`);
  };
  const reject = () => {
    const list = store.getDeposits();
    const i = list.findIndex((x) => x.id === d.id);
    if (i === -1) return;
    list[i].status = "rejected";
    list[i].resolvedAt = Date.now();
    store.setDeposits(list);
    addDepositMessage(d.id, { from: "admin", text: "Depósito rejeitado." });
    toast("Pedido rejeitado");
  };

  return (
    <Card className="border-primary/20 bg-card/80">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between text-left">
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">{d.userEmail} <StatusPill status={d.status} /></div>
          <div className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</div>
        </div>
        <div className="font-mono text-2xl text-primary font-bold mr-3">+{d.amount}</div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {(d.status === "pending" || d.status === "awaiting_payment") && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Chave PIX para o usuário pagar</label>
                <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave PIX" />
              </div>
              <Button size="sm" variant="outline" className="border-primary/40 text-primary" onClick={sendPix}>
                <KeyRound className="h-4 w-4 mr-1" /> {d.pixKey ? "Reenviar" : "Enviar PIX"}
              </Button>
            </div>
          )}

          <RequestThread
            messages={d.messages || []}
            from="admin"
            onSend={(m) => addDepositMessage(d.id, { from: "admin", ...m })}
            placeholder="Mensagem para o usuário…"
          />

          {(d.status === "pending" || d.status === "awaiting_payment") && (
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button size="sm" variant="destructive" onClick={reject}><X className="h-4 w-4" /> Rejeitar</Button>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={approve}>
                <Check className="h-4 w-4" /> Aprovar e creditar
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function WithdrawCard({ w }: { w: WithdrawRequest }) {
  const [open, setOpen] = useState(w.status === "pending");

  const approve = () => {
    const users = store.getUsers();
    const u = users.find((x) => x.id === w.userId);
    if (!u) return toast.error("Usuário não encontrado");
    if (u.balance < w.amount) return toast.error("Saldo do usuário insuficiente");
    const list = store.getWithdrawals();
    const i = list.findIndex((x) => x.id === w.id);
    list[i].status = "approved";
    list[i].resolvedAt = Date.now();
    store.setWithdrawals(list);
    adjustBalance(w.userId, -w.amount, { type: "adjust", note: `Saque PIX #${w.id.slice(0, 6)}` });
    addWithdrawMessage(w.id, { from: "admin", text: `Saque de ${w.amount} aprovado e pago via PIX (${w.pixKey}).` });
    toast.success("Saque aprovado");
  };
  const reject = () => {
    const list = store.getWithdrawals();
    const i = list.findIndex((x) => x.id === w.id);
    list[i].status = "rejected";
    list[i].resolvedAt = Date.now();
    store.setWithdrawals(list);
    addWithdrawMessage(w.id, { from: "admin", text: "Saque rejeitado." });
    toast("Saque rejeitado");
  };

  return (
    <Card className="border-primary/20 bg-card/80">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between text-left">
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">{w.userEmail} <StatusPill status={w.status} /></div>
          <div className="text-xs text-muted-foreground">PIX: {w.pixKey} · {new Date(w.createdAt).toLocaleString()}</div>
        </div>
        <div className="font-mono text-2xl text-destructive font-bold mr-3">-{w.amount}</div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <RequestThread
            messages={w.messages || []}
            from="admin"
            onSend={(m) => addWithdrawMessage(w.id, { from: "admin", ...m })}
            placeholder="Anexe o comprovante de pagamento ou escreva uma mensagem…"
          />
          {w.status === "pending" && (
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button size="sm" variant="destructive" onClick={reject}><X className="h-4 w-4" /> Rejeitar</Button>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={approve}>
                <Check className="h-4 w-4" /> Aprovar e debitar
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function UserRow({ userId, email, name, balance }: { userId: string; email: string; name: string; balance: number }) {
  const [delta, setDelta] = useState("");
  const apply = () => {
    const v = parseFloat(delta);
    if (!v) return toast.error("Informe um valor");
    adjustBalance(userId, v, { type: "adjust", note: "Ajuste manual admin" });
    toast.success(`Ajuste de ${v} aplicado`);
    setDelta("");
  };
  return (
    <Card className="p-4 flex items-center justify-between border-border bg-card/80">
      <div>
        <div className="font-medium">{name} <span className="text-muted-foreground text-sm">· {email}</span></div>
        <div className="text-sm text-primary font-mono flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{balance.toFixed(2)}</div>
      </div>
      <div className="flex items-center gap-2">
        <Input className="w-28" placeholder="±valor" value={delta} onChange={(e) => setDelta(e.target.value)} type="number" />
        <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10" onClick={apply}>Ajustar</Button>
      </div>
    </Card>
  );
}
