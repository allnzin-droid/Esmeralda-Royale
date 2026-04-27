import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { store, uid, type WithdrawRequest } from "@/lib/store";
import { Banknote } from "lucide-react";
import { toast } from "sonner";

export function WithdrawDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [pix, setPix] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const v = parseFloat(amount);
    if (!v || v <= 0) return toast.error("Valor inválido");
    if (v > user.balance) return toast.error("Saldo insuficiente");
    if (!pix.trim()) return toast.error("Informe sua chave PIX");
    const list = store.getWithdrawals();
    const req: WithdrawRequest = {
      id: uid(),
      userId: user.id,
      userEmail: user.email,
      amount: +v.toFixed(2),
      pixKey: pix.trim(),
      status: "pending",
      createdAt: Date.now(),
      messages: [],
    };
    list.unshift(req);
    store.setWithdrawals(list);
    toast.success("Solicitação de saque enviada!");
    setOpen(false);
    setAmount("100");
    setPix("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
          <Banknote className="h-4 w-4 mr-1" /> Sacar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">Solicitar saque</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Quantidade de moedas</Label>
            <Input type="number" min={1} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <p className="text-xs text-muted-foreground mt-1">Saldo atual: {user?.balance.toFixed(2)}</p>
          </div>
          <div>
            <Label>Sua chave PIX</Label>
            <Input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" required maxLength={120} />
          </div>
          <p className="text-xs text-muted-foreground">
            O admin avaliará sua solicitação e enviará o comprovante na aba de Mensagens.
          </p>
          <DialogFooter>
            <Button type="submit" className="bg-gradient-emerald shadow-emerald">Enviar solicitação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
