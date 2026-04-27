import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useDeposits, useUsers } from "@/lib/hooks";
import { store, adjustBalance } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Coins } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const users = useUsers();
  const deposits = useDeposits();

  useEffect(() => {
    if (!user) nav({ to: "/auth" });
    else if (!isAdmin) nav({ to: "/dashboard" });
  }, [user, isAdmin, nav]);
  if (!user || !isAdmin) return null;

  const pending = deposits.filter((d) => d.status === "pending");
  const resolved = deposits.filter((d) => d.status !== "pending");

  const approve = (id: string) => {
    const list = store.getDeposits();
    const d = list.find((x) => x.id === id);
    if (!d || d.status !== "pending") return;
    d.status = "approved";
    d.resolvedAt = Date.now();
    store.setDeposits(list);
    adjustBalance(d.userId, d.amount, { type: "deposit", note: `Pedido #${d.id.slice(0, 6)}` });
    toast.success(`Aprovado: +${d.amount} para ${d.userEmail}`);
  };
  const reject = (id: string) => {
    const list = store.getDeposits();
    const d = list.find((x) => x.id === id);
    if (!d) return;
    d.status = "rejected";
    d.resolvedAt = Date.now();
    store.setDeposits(list);
    toast("Pedido rejeitado");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold glow-gold">Painel Admin</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários e pedidos de saldo</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            Pedidos {pending.length > 0 && <span className="ml-2 rounded-full bg-gold text-gold-foreground px-2 text-xs">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="users">Usuários ({users.length})</TabsTrigger>
          <TabsTrigger value="resolved">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3 mt-4">
          {pending.length === 0 && <p className="text-muted-foreground text-sm">Sem pedidos pendentes.</p>}
          {pending.map((d) => (
            <Card key={d.id} className="p-4 flex items-center justify-between border-gold/30 bg-card/80">
              <div>
                <div className="font-medium">{d.userEmail}</div>
                <div className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-mono text-2xl text-gold font-bold">+{d.amount}</div>
                <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => approve(d.id)}>
                  <Check className="h-4 w-4" /> Aprovar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reject(d.id)}>
                  <X className="h-4 w-4" /> Rejeitar
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="users" className="space-y-3 mt-4">
          {users.map((u) => (
            <UserRow key={u.id} userId={u.id} email={u.email} name={u.name} balance={u.balance} />
          ))}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-3 mt-4">
          {resolved.length === 0 && <p className="text-muted-foreground text-sm">Nenhum pedido resolvido.</p>}
          {resolved.map((d) => (
            <Card key={d.id} className="p-3 flex items-center justify-between bg-card/60">
              <div className="text-sm">
                <span className="font-medium">{d.userEmail}</span>
                <span className="text-muted-foreground"> · {new Date(d.resolvedAt || d.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">{d.amount}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "approved" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                  {d.status === "approved" ? "Aprovado" : "Rejeitado"}
                </span>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
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
        <div className="text-sm text-gold font-mono flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{balance.toFixed(2)}</div>
      </div>
      <div className="flex items-center gap-2">
        <Input className="w-28" placeholder="±valor" value={delta} onChange={(e) => setDelta(e.target.value)} type="number" />
        <Button size="sm" variant="outline" className="border-gold/40 text-gold hover:bg-gold/10" onClick={apply}>Ajustar</Button>
      </div>
    </Card>
  );
}
