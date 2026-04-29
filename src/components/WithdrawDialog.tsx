import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Banknote } from "lucide-react";
import { toast } from "sonner";

const MAX = 100000;

export function WithdrawDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [pix, setPix] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const v = parseFloat(amount);
    if (!Number.isFinite(v) || v <= 0) return toast.error("Valor inválido");
    if (v > MAX) return toast.error(`Máximo por pedido: ${MAX}`);
    if (v > user.balance) return toast.error("Saldo insuficiente");
    if (!pix.trim()) return toast.error("Informe sua chave PIX");
    if (pix.trim().length > 120) return toast.error("Chave PIX muito longa");
    setSubmitting(true);
    const { error } = await supabase.from("withdraw_requests").insert({
      user_id: user.id,
      amount: +v.toFixed(2),
      pix_key: pix.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
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
            <Input type="number" min={1} max={MAX} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
            <Button type="submit" disabled={submitting} className="bg-gradient-emerald shadow-emerald">
              {submitting ? "Enviando..." : "Enviar solicitação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
