import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDeposits, useUsers, useWithdrawals } from "@/lib/hooks";
import {
  addDepositMessage,
  addWithdrawMessage,
  adminPin,
  type DepositRequest,
  type WithdrawRequest,
} from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
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
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const users = useUsers();
  const deposits = useDeposits();
  const withdrawals = useWithdrawals();

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (!isAdmin) nav({ to: "/dashboard" });
  }, [user, isAdmin, loading, nav]);
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
  const { request, node } = useAdminConfirm();

  const sendPix = async () => {
    if (!pixKey.trim()) return toast.error("Informe a chave PIX");
    const { error } = await supabase.rpc("admin_set_deposit_pix", { _id: d.id, _pix: pixKey.trim() });
    if (error) return toast.error(error.message);
    await addDepositMessage(d.id, { from: "admin", text: `Chave PIX para pagamento: ${pixKey.trim()}` });
    toast.success("Chave PIX enviada ao usuário");
  };

  const doApprove = async () => {
    const { error } = await supabase.rpc("admin_resolve_deposit", { _id: d.id, _approve: true });
    if (error) return toast.error(error.message);
    await addDepositMessage(d.id, { from: "admin", text: `Depósito aprovado. ${d.amount} moedas creditadas.` });
    toast.success(`+${d.amount} para ${d.userEmail}`);
  };
  const doReject = async () => {
    const { error } = await supabase.rpc("admin_resolve_deposit", { _id: d.id, _approve: false });
    if (error) return toast.error(error.message);
    await addDepositMessage(d.id, { from: "admin", text: "Depósito rejeitado." });
    toast("Pedido rejeitado");
  };

  const approve = () =>
    request(doApprove, {
      title: "Aprovar depósito",
      description: `Confirme a aprovação de ${d.amount} moedas para ${d.userEmail}.`,
      force: true,
    });
  const reject = () =>
    request(doReject, {
      title: "Rejeitar depósito",
      description: `Confirme a rejeição do pedido de ${d.userEmail}.`,
      force: true,
    });

  return (
    <Card className="border-primary/20 bg-card/80">
      {node}
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
                <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave PIX" maxLength={120} />
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
                <ShieldCheck className="h-4 w-4" /> Aprovar e creditar
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
  const { request, node } = useAdminConfirm();

  const doApprove = async () => {
    const { error } = await supabase.rpc("admin_resolve_withdraw", { _id: w.id, _approve: true });
    if (error) return toast.error(error.message);
    await addWithdrawMessage(w.id, { from: "admin", text: `Saque de ${w.amount} aprovado e pago via PIX (${w.pixKey}).` });
    toast.success("Saque aprovado");
  };
  const doReject = async () => {
    const { error } = await supabase.rpc("admin_resolve_withdraw", { _id: w.id, _approve: false });
    if (error) return toast.error(error.message);
    await addWithdrawMessage(w.id, { from: "admin", text: "Saque rejeitado." });
    toast("Saque rejeitado");
  };

  const approve = () =>
    request(doApprove, {
      title: "Aprovar saque",
      description: `Confirme o saque de ${w.amount} via PIX (${w.pixKey}) para ${w.userEmail}.`,
      force: true,
    });
  const reject = () =>
    request(doReject, {
      title: "Rejeitar saque",
      description: `Confirme a rejeição do saque de ${w.userEmail}.`,
      force: true,
    });

  return (
    <Card className="border-primary/20 bg-card/80">
      {node}
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
                <ShieldCheck className="h-4 w-4" /> Aprovar e debitar
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
  const { request, node } = useAdminConfirm();
  const apply = () => {
    const v = parseFloat(delta);
    if (!Number.isFinite(v) || v === 0) return toast.error("Informe um valor");
    request(
      async () => {
        const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: userId, _delta: v, _note: "Ajuste manual admin" });
        if (error) return toast.error(error.message);
        toast.success(`Ajuste de ${v} aplicado`);
        setDelta("");
      },
      {
        title: "Confirmar ajuste de saldo",
        description: `Aplicar ${v > 0 ? "+" : ""}${v} ao saldo de ${email}.`,
        force: true,
      },
    );
  };
  return (
    <Card className="p-4 flex items-center justify-between border-border bg-card/80">
      {node}
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

// ===== Status do PIN admin (gerenciamento + indicador) =====
function AdminPinStatus() {
  const [, force] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const hasPin = adminPin.isSet();
  const unlocked = adminPin.isUnlocked();
  const remainMin = Math.ceil(adminPin.remainingMs() / 60000);

  return (
    <Card className="px-3 py-2 flex items-center gap-3 border-primary/30 bg-card/80">
      {hasPin ? (
        unlocked ? (
          <span className="flex items-center gap-1.5 text-xs text-success">
            <ShieldCheck className="h-4 w-4" /> Modo seguro: {remainMin} min
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-4 w-4" /> PIN ativo · pedirá confirmação
          </span>
        )
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-amber-400">
          <ShieldAlert className="h-4 w-4" /> PIN não configurado
        </span>
      )}
      <div className="flex gap-1">
        {hasPin && unlocked && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              adminPin.lock();
              force((n) => n + 1);
              toast("Modo seguro encerrado");
            }}
          >
            Bloquear
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-primary/40 text-primary"
          onClick={() => {
            if (hasPin) {
              adminPin.clear();
              adminPin.lock();
              toast("PIN removido. Configure um novo.");
            }
            setSetupOpen(true);
          }}
        >
          {hasPin ? "Trocar PIN" : "Definir PIN"}
        </Button>
      </div>
      <AdminPinGate
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onConfirm={() => {}}
        title="Configurar PIN administrativo"
        description="Defina um PIN de 4 dígitos para confirmar aprovações."
      />
    </Card>
  );
}
