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

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setMensagem(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/api/auth/callback`
            : undefined,
      },
    });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setMensagem("Conta criada. Verifique seu email para confirmar.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
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
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                disabled={carregando}
              />
            </div>
            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}
            {mensagem && (
              <p className="text-sm text-emerald-600">{mensagem}</p>
            )}
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? "Criando..." : "Criar conta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
