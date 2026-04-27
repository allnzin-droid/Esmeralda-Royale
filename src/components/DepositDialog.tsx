import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { store, uid, type DepositRequest } from "@/lib/store";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function DepositDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const v = parseFloat(amount);
    if (!v || v <= 0) return toast.error("Valor inválido");
    const list = store.getDeposits();
    const req: DepositRequest = {
      id: uid(),
      userId: user.id,
      userEmail: user.email,
      amount: +v.toFixed(2),
      status: "pending",
      createdAt: Date.now(),
    };
    list.unshift(req);
    store.setDeposits(list);
    toast.success("Pedido enviado! Aguarde aprovação do admin.");
    setOpen(false);
    setAmount("100");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-emerald shadow-emerald">
          <Plus className="h-4 w-4 mr-1" /> Adicionar saldo
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-gold/30">
        <DialogHeader>
          <DialogTitle className="font-display text-gold">Solicitar moedas</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Quantidade de moedas</Label>
            <Input type="number" min={1} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[100, 500, 1000, 5000].map((v) => (
              <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(String(v))} className="border-gold/30">
                {v}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            O admin receberá seu pedido e aprovará. Após aprovação, suas moedas aparecem automaticamente.
          </p>
          <DialogFooter>
            <Button type="submit" className="bg-gradient-gold shadow-gold">Enviar pedido</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
