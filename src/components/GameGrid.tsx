import { Link } from "@tanstack/react-router";
import { Coins, Dices, TrendingUp, Package, Cherry, Circle, Sparkles } from "lucide-react";

const games = [
  { id: "tiger", name: "Fortune Tiger 🐯", desc: "Grid 3x3 com diagonais — o tigre paga grande!", icon: Sparkles, to: "/games/tiger" as const },
  { id: "roulette", name: "Roleta", desc: "Aposte em vermelho, preto ou número.", icon: Dices, to: "/games/roulette" as const },
  { id: "lucky", name: "Raspadinha", desc: "Raspe e descubra seu prêmio.", icon: Cherry, to: "/games/lucky" as const },
  { id: "crash", name: "Crash", desc: "Defina o cash-out antes do colapso.", icon: TrendingUp, to: "/games/crash" as const },
  { id: "boxes", name: "Caixas Premiadas", desc: "Escolha 1 entre 9 caixas.", icon: Package, to: "/games/boxes" as const },
  { id: "slots", name: "Caça-Níqueis", desc: "Combine 3 símbolos iguais.", icon: Coins, to: "/games/slots" as const },
  { id: "coin", name: "Cara ou Coroa", desc: "Dobre sua aposta.", icon: Circle, to: "/games/coin" as const },
];

export function GameGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((g) => (
        <Link
          key={g.id}
          to={g.to}
          className="group rounded-2xl border border-border bg-card/70 backdrop-blur p-6 hover:border-gold/50 hover:shadow-gold transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-emerald grid place-items-center shadow-emerald">
              <g.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-xl text-gold">{g.name}</div>
              <p className="text-sm text-muted-foreground mt-1">{g.desc}</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-gold/70 group-hover:text-gold transition">Jogar →</div>
        </Link>
      ))}
    </div>
  );
}
