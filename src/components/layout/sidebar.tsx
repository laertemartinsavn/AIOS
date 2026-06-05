"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  userInitials: string;
  userName: string;
  appVersion?: string;
  buildDate?: string;
};

export function Sidebar({ userInitials, userName, appVersion, buildDate }: Props) {
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";
  const isAnalises =
    pathname.startsWith("/dashboard/analises") ||
    (pathname.startsWith("/dashboard/chamadas/") &&
      !pathname.endsWith("/proposta") &&
      !pathname.includes("/nova"));
  const isPropostas =
    pathname.startsWith("/dashboard/propostas") ||
    pathname.endsWith("/proposta");
  const isNova = pathname.startsWith("/dashboard/chamadas/nova");

  return (
    <aside className="flex w-[240px] flex-shrink-0 flex-col gap-6 overflow-y-auto bg-[#1F2255] px-4 py-[22px]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-1.5 pb-1">
        <div>
          <div className="font-brand text-[15px] font-bold leading-none tracking-tight text-white">
            AVN Comercial
          </div>
          <div className="mt-1 font-brand text-[8.5px] uppercase tracking-[.26em] text-white/55">
            T E C N O L O G I A
          </div>
        </div>
      </div>

      {/* Version badge */}
      <div className="rounded-lg bg-white/[0.06] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-brand text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">
            Versão
          </span>
          <span className="font-brand text-[12px] font-bold text-white/80">
            v{appVersion ?? "—"}
          </span>
        </div>
        {buildDate && (
          <div className="mt-0.5 text-[10px] text-white/35">
            {new Date(buildDate).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* Operação */}
      <div className="flex flex-col gap-0.5">
        <div className="px-3 pb-2 font-brand text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">
          Operação
        </div>
        <SideItem
          href="/dashboard"
          label="Visão geral"
          active={isDashboard}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
          }
        />
        <SideItem
          href="/dashboard/analises"
          label="Análises"
          active={isAnalises}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          }
        />
        <SideItem
          href="/dashboard/propostas"
          label="Propostas"
          active={isPropostas}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />
        <SideItem
          href="#"
          label="Clientes"
          active={false}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <SideItem
          href="#"
          label="Agenda"
          active={false}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
        />
      </div>

      {/* Catálogo */}
      <div className="flex flex-col gap-0.5">
        <div className="px-3 pb-2 font-brand text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">
          Catálogo
        </div>
        <SideItem
          href="#"
          label="Produtos"
          active={false}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          }
        />
        <SideItem
          href="#"
          label="Templates"
          active={false}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          }
        />
        <SideItem
          href="#"
          label="Configurações"
          active={false}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          }
        />
      </div>

      {/* User footer */}
      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-white/[0.06] p-3.5">
        <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[#F28B3A] font-brand text-[12px] font-bold text-white">
          {userInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-brand text-[13px] font-semibold leading-tight text-white">
            {userName}
          </div>
          <form action="/sair" method="POST" className="mt-0.5">
            <button
              type="submit"
              className="text-[11px] text-white/60 transition-colors hover:text-white/90"
            >
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function SideItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-all ${
        active
          ? "bg-[#3D4392] text-white shadow-[0_6px_16px_rgba(0,0,0,0.22)]"
          : "text-white/[0.74] hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className="h-[18px] w-[18px] flex-shrink-0 [&>svg]:h-full [&>svg]:w-full [&>svg]:[stroke-width:1.5]">
        {icon}
      </span>
      {label}
    </Link>
  );
}
