import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send } from "lucide-react";
import type { RequestMessage } from "@/lib/store";
import { toast } from "sonner";

export function RequestThread({
  messages,
  from,
  onSend,
  placeholder = "Escreva uma mensagem…",
}: {
  messages: RequestMessage[];
  from: "user" | "admin";
  onSend: (msg: { text?: string; attachment?: { name: string; dataUrl: string } }) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; dataUrl: string } | null>(null);

  const handleFile = (f: File) => {
    if (f.size > 1.5 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 1.5MB)");
    const reader = new FileReader();
    reader.onload = () => setPendingFile({ name: f.name, dataUrl: String(reader.result) });
    reader.readAsDataURL(f);
  };

  const send = () => {
    if (!text.trim() && !pendingFile) return;
    onSend({ text: text.trim() || undefined, attachment: pendingFile || undefined });
    setText("");
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="max-h-72 overflow-y-auto space-y-2 rounded-lg border border-border bg-background/40 p-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Sem mensagens ainda.</p>
        )}
        {messages.map((m) => {
          const mine = m.from === from;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary/20 border border-primary/30" : "bg-secondary border border-border"}`}>
                <div className="text-[10px] text-muted-foreground mb-1">
                  {m.from === "admin" ? "Admin" : "Usuário"} · {new Date(m.createdAt).toLocaleString()}
                </div>
                {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                {m.attachment && m.attachment.dataUrl.startsWith("data:") && (
                  <a href={m.attachment.dataUrl} download={m.attachment.name} target="_blank" rel="noreferrer noopener" className="mt-2 block">
                    {m.attachment.dataUrl.startsWith("data:image") ? (
                      <img src={m.attachment.dataUrl} alt={m.attachment.name} className="max-h-40 rounded border border-border" />
                    ) : (
                      <span className="text-xs underline text-primary">📎 {m.attachment.name}</span>
                    )}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={2} />
        {pendingFile && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            📎 {pendingFile.name}
            <button type="button" className="text-destructive" onClick={() => setPendingFile(null)}>remover</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4 mr-1" /> Anexar comprovante
          </Button>
          <Button type="button" size="sm" className="bg-gradient-emerald shadow-emerald" onClick={send}>
            <Send className="h-4 w-4 mr-1" /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
