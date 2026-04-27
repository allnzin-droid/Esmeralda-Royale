import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, Shield, Home, MessageSquare } from "lucide-react";

export function AppShell() {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/70 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-full bg-gradient-gold grid place-items-center shadow-gold group-hover:scale-105 transition">
              <span className="font-display font-bold text-lg">E</span>
            </div>
            <div className="font-display text-xl text-gold glow-gold">Esmeralda Royale</div>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-gold/30">
                  <Coins className="h-4 w-4 text-gold" />
                  <span className="font-mono font-semibold text-gold">{user.balance.toFixed(2)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dashboard" })}>
                  <Home className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => nav({ to: "/messages" })}>
                  <MessageSquare className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => nav({ to: "/admin" })}>
                    <Shield className="h-4 w-4 text-gold" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { signOut(); nav({ to: "/" }); }}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-gradient-gold shadow-gold" onClick={() => nav({ to: "/auth" })}>
                Entrar
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        🎲 Plataforma com <span className="text-gold">moedas virtuais</span> apenas. Sem dinheiro real. Demo local.
      </footer>
    </div>
  );
}
