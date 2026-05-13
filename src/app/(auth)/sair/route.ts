import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Importante: signOut só por POST. Se fosse GET, qualquer prefetch
// do <Link href="/sair"> ou crawler dispararia logout do usuário
// silenciosamente — foi exatamente o bug que vimos em produção.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
