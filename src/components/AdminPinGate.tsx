import { useEffect, useState } from "react";
import { adminPin } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
};

/**
 * Diálogo de confirmação 2-etapas para ações sensíveis do admin.
 * - Se nenhum PIN foi configurado, oferece o setup (digitar + confirmar).
 * - Se já existe PIN, exige a digitação para liberar a ação.
 * - Após confirmar, libera o "modo seguro" por alguns minutos para evitar
 *   pedir o PIN repetidamente em sequência.
 */
export function AdminPinGate({ open, onClose, onConfirm, title, description }: Props) {
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [mode, setMode] = useState<"setup" | "verify">("verify");

  useEffect(() => {
    if (!open) return;
    const exists = adminPin.isSet();
    setHasPin(exists);
    setMode(exists ? "verify" : "setup");
    setPin("");
    setConfirmPin("");
  }, [open]);

  const handleSetup = async () => {
    if (pin.length !== 4) return toast.error("O PIN deve ter 4 dígitos");
    if (pin !== confirmPin) return toast.error("Os PINs não conferem");
    await adminPin.set(pin);
    adminPin.unlock();
    toast.success("PIN configurado e ação confirmada");
    onConfirm();
    onClose();
  };

  const handleVerify = async () => {
    if (pin.length !== 4) return toast.error("Digite o PIN de 4 dígitos");
    if (adminPin.isLockedOut()) {
      return toast.error("Muitas tentativas. Recarregue a página para tentar novamente.");
    }
    const ok = await adminPin.verify(pin);
    if (!ok) {
      setPin("");
      const left = adminPin.attemptsLeft();
      return toast.error(
        left > 0 ? `PIN incorreto (${left} tentativa(s) restante(s))` : "Bloqueado. Recarregue a página.",
      );
    }
    adminPin.unlock();
    toast.success("Ação confirmada");
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title || "Confirmação de segurança"}
          </DialogTitle>
          <DialogDescription>
            {description || "Confirme com seu PIN administrativo para concluir esta ação."}
          </DialogDescription>
        </DialogHeader>

        {mode === "setup" ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" /> Crie um PIN de 4 dígitos. Ele será exigido em
              aprovações futuras.
            </p>
            <div>
              <label className="text-xs text-muted-foreground">Novo PIN</label>
              <PinInput value={pin} onChange={setPin} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Confirme o PIN</label>
              <PinInput value={confirmPin} onChange={setConfirmPin} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground">PIN administrativo</label>
            <PinInput value={pin} onChange={setPin} autoFocus />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {mode === "setup" ? (
            <Button onClick={handleSetup} className="bg-primary text-primary-foreground">
              Definir PIN e confirmar
            </Button>
          ) : (
            <Button onClick={handleVerify} className="bg-primary text-primary-foreground">
              Confirmar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PinInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <InputOTP maxLength={4} value={value} onChange={onChange} autoFocus={autoFocus}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}

/**
 * Hook utilitário: envolve uma ação com confirmação por PIN.
 * Se o "modo seguro" estiver liberado, executa direto; caso contrário, pede PIN.
 */
export function useAdminConfirm() {
  const [pending, setPending] = useState<null | {
    action: () => void;
    title?: string;
    description?: string;
  }>(null);

  const request = (
    action: () => void,
    opts?: { title?: string; description?: string; force?: boolean },
  ) => {
    if (!opts?.force && adminPin.isUnlocked()) {
      action();
      return;
    }
    setPending({ action, title: opts?.title, description: opts?.description });
  };

  const node = (
    <AdminPinGate
      open={!!pending}
      onClose={() => setPending(null)}
      onConfirm={() => pending?.action()}
      title={pending?.title}
      description={pending?.description}
    />
  );

  return { request, node };
}
