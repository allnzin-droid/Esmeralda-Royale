import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, ArrowLeft } from "lucide-react";

export function GameLayout({
  title,
  description,
  bet,
  setBet,
  children,
  disabled,
}: {
  title: string;
  description: string;
  bet: number;
  setBet: (n: number) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-gold flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-gold/30">
          <Coins className="h-4 w-4 text-gold" />
          <span className="font-mono text-gold">{user?.balance.toFixed(2) ?? "0.00"}</span>
        </div>
      </div>
      <div>
        <h1 className="font-display text-3xl text-gold glow-gold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-2xl border border-gold/20 felt p-6 md:p-8">{children}</div>
      <div className="rounded-2xl border border-border bg-card/70 p-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Aposta:</span>
        <Input
          type="number"
          min={1}
          value={bet}
          onChange={(e) => setBet(Math.max(1, parseFloat(e.target.value) || 0))}
          disabled={disabled}
          className="max-w-32"
        />
        <div className="flex gap-1 flex-wrap">
          {[10, 50, 100, 500].map((v) => (
            <Button key={v} size="sm" variant="outline" disabled={disabled} className="border-gold/30" onClick={() => setBet(v)}>
              {v}
            </Button>
          ))}
          <Button size="sm" variant="outline" disabled={disabled} className="border-gold/30" onClick={() => setBet(Math.floor(user?.balance ?? 0))}>
            Tudo
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useBetState(initial = 10) {
  return useState(initial);
}
