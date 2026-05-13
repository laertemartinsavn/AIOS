import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function TopNav() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          AIOS
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user?.email && (
            <span className="text-muted-foreground">{user.email}</span>
          )}
          {/* form POST evita que prefetch de Link dispare signOut acidental */}
          <form action="/sair" method="POST">
            <button
              type="submit"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
