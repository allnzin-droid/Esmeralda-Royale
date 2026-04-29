import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const MAX = 100000;

export function DepositDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const v = parseFloat(amount);
    if (!Number.isFinite(v) || v <= 0) return toast.error("Valor inválido");
    if (v > MAX) return toast.error(`Máximo por pedido: ${MAX}`);
    setSubmitting(true);
    const { error } = await supabase.from("deposit_requests").insert({
      user_id: user.id,
      amount: +v.toFixed(2),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
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
            <Input type="number" min={1} max={MAX} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
            <Button type="submit" disabled={submitting} className="bg-gradient-gold shadow-gold">
              {submitting ? "Enviando..." : "Enviar pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
