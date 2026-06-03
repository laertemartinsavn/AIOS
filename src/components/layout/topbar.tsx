"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { userInitials: string };

function getBreadcrumb(pathname: string): { section: string; title: string } {
  if (pathname === "/dashboard") {
    return { section: "Visão geral", title: "Dashboard comercial" };
  }
  if (pathname.startsWith("/dashboard/chamadas/nova")) {
    return { section: "Nova análise", title: "Nova análise" };
  }
  if (pathname.endsWith("/proposta")) {
    return { section: "Propostas", title: "Proposta comercial" };
  }
  if (pathname.startsWith("/dashboard/chamadas/")) {
    return { section: "Análises", title: "Análise" };
  }
  return { section: "Dashboard", title: "AVN Comercial" };
}

export function Topbar({ userInitials }: Props) {
  const pathname = usePathname();
  const { section, title } = getBreadcrumb(pathname);

  return (
    <header className="flex flex-shrink-0 items-center gap-4 border-b border-[#D8DAF0] bg-white px-7 py-4">
      {/* Breadcrumb + page title */}
      <div className="flex flex-col gap-0.5">
        <div className="text-[11px] tracking-[.04em] text-[#797C7F]">
          Comercial{" "}
          <span className="mx-1 text-[#A9ABAE]">/</span>
          <span className="font-medium text-[#44464A]">{section}</span>
        </div>
        <div className="font-brand text-[19px] font-bold leading-tight tracking-tight text-[#1F2255]">
          {title}
        </div>
      </div>

      {/* Search */}
      <div className="ml-6 flex max-w-[340px] flex-1 items-center gap-2 rounded-lg bg-[#F1F2F3] px-3 py-2">
        <svg
          className="h-[15px] w-[15px] flex-shrink-0 text-[#797C7F]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Buscar análise ou proposta"
          className="flex-1 bg-transparent text-[13px] font-light text-[#1F2255] outline-none placeholder:text-[#A9ABAE]"
        />
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2.5">
        <Link
          href="/dashboard/chamadas/nova"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3D4392] px-3.5 py-2 text-[13px] font-normal text-white shadow-[0_12px_28px_rgba(61,67,146,0.22)] transition-colors hover:bg-[#5258AB]"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova análise
        </Link>
        <div className="mx-1 h-6 w-px bg-[#D8DAF0]" />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3D4392] font-brand text-[13px] font-bold text-white">
          {userInitials}
        </div>
      </div>
    </header>
  );
}
