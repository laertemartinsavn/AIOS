"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("Email ou senha incorretos.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={aoEnviar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={carregando}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                disabled={carregando}
              />
            </div>
            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Sem conta?{" "}
              <Link href="/cadastro" className="underline underline-offset-4 hover:text-foreground">
                Criar agora
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
