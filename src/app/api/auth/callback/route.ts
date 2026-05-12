import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function caminhoSeguro(valor: string | null): string {
  if (!valor) return "/dashboard";
  // Aceita apenas caminhos relativos próprios da app — bloqueia "//evil.com" e "https://..."
  if (valor.startsWith("/") && !valor.startsWith("//")) return valor;
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = caminhoSeguro(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=callback`);
}
