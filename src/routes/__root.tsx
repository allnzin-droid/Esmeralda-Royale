import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-gold glow-gold">404</h1>
        <p className="mt-2 text-muted-foreground">Página não encontrada</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold shadow-gold">
          Voltar
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Esmeralda Royale — Cassino Virtual" },
      { name: "description", content: "Cassino virtual com moedas demo. Roleta, slots, crash e mais." },
    ],
    links: [{ rel: "stylesheet", href: appCss }, { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AppShell />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
