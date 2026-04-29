import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";


export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  const handleIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await signIn(email, password);
    if (!r.ok) toast.error(r.error);
    else toast.success("Bem-vindo!");
  };
  const handleUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await signUp(email, name, password);
    if (!r.ok) toast.error(r.error);
    else toast.success("Conta criada!");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl border border-gold/30 bg-card/80 backdrop-blur p-8 shadow-emerald">
        <h1 className="font-display text-3xl text-gold text-center glow-gold mb-1">Bem-vindo</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">Entre ou crie sua conta para jogar</p>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleIn} className="space-y-4 pt-4">
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-gold shadow-gold">Entrar</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleUp} className="space-y-4 pt-4">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
              </div>
              <Button type="submit" className="w-full bg-gradient-gold shadow-gold">Criar conta</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
