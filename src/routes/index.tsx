import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, ShieldAlert, Dices } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  return (
    <div className="relative">
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/60 px-4 py-1.5 text-xs text-gold mb-6 animate-float-up">
          <ShieldAlert className="h-3.5 w-3.5" />
          Jogue com responsabilidade
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold text-gold glow-gold animate-float-up">
          Esmeralda Royale
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto animate-float-up">
          Roleta, crash, caça-níqueis, caixas premiadas e mais. Aposte suas moedas virtuais e tente a sorte na mesa esmeralda.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" className="bg-gradient-gold shadow-gold animate-pulse-gold" onClick={() => nav({ to: "/auth" })}>
            <Sparkles className="h-4 w-4 mr-2" /> Começar a jogar
          </Button>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="border-gold/40 text-gold hover:bg-gold/10">
              Já tenho conta
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { icon: Dices, title: "Múltiplas opções de jogos", text: "Roleta, número da sorte, crash, caixas, slot, tigrinho e cara/coroa." },
            { icon: Coins, title: "Simples de jogar e ganhar", text: "Solicite moedas ao admin e jogue à vontade. Sem custos reais." },
            { icon: ShieldAlert, title: "Demo por plataforma oficial segura", text: "Ambiente protegido para entretenimento responsável." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur hover:border-gold/40 transition">
              <div className="h-10 w-10 rounded-lg bg-gradient-emerald grid place-items-center shadow-emerald mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="font-display text-xl mb-1">{f.title}</div>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
