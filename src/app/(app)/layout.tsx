import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/require-user";

function getInitials(email: string, name?: string | null): string {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getDisplayName(email: string, metadata: Record<string, unknown>): string {
  const full = metadata?.full_name ?? metadata?.name;
  if (typeof full === "string" && full.trim()) return full.trim();
  return email.split("@")[0];
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";
  const displayName = getDisplayName(email, meta);
  const initials = getInitials(email, displayName);

  return (
    <div className="flex h-screen overflow-hidden bg-[#1F2255]">
      <Sidebar userInitials={initials} userName={displayName} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar userInitials={initials} />
        <main className="flex-1 overflow-auto bg-[#F4F5FB]">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
