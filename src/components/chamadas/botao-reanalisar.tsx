"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BarraProgressoIA } from "@/components/ui/barra-progresso-ia";

export function BotaoReanalisar({ chamadaId }: { chamadaId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [instrucoes, setInstrucoes] = useState("");

  async function reanalisar() {
    setCarregando(true);
    try {
      const res = await fetch(`/api/chamadas/${chamadaId}/reanalisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrucoes: instrucoes.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Falha ao reanalisar a chamada.");
      }
      toast.success("Análise gerada com sucesso!");
      setAberto(false);
      setInstrucoes("");
      router.refresh();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  function cancelar() {
    setAberto(false);
    setInstrucoes("");
  }

  if (carregando) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[#D8DAF0] bg-white px-4 py-2.5 text-[13px] text-[#1F2255] opacity-60">
          Analisando com IA…
        </div>
        <BarraProgressoIA ativo estimadoSegundos={60} label="Reanalísando com IA…" />
      </div>
    );
  }

  if (aberto) {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-[#D8DAF0] bg-[#F8F9FE] p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[11.5px] font-semibold text-[#1F2255]">
            Orientações para a IA
          </p>
          <button
            onClick={cancelar}
            className="text-[#B0B3C6] transition-colors hover:text-[#797C7F]"
            aria-label="Fechar"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={instrucoes}
          onChange={(e) => setInstrucoes(e.target.value)}
          placeholder="Ex: O cliente é do setor financeiro e confirmou budget para Q3. A análise mencionou também uma expansão de equipe de 30 pessoas…"
          rows={4}
          maxLength={4000}
          className="w-full resize-none rounded-lg border border-[#D8DAF0] bg-white px-3 py-2 text-[12px] leading-relaxed text-[#1F2255] placeholder:text-[#B0B3C6] outline-none focus:border-[#3D4392] focus:ring-2 focus:ring-[#3D4392]/20"
        />

        <p className="text-[10.5px] text-[#A9ABAE]">
          Opcional — deixe em branco para reanalisar sem orientações extras.
          {instrucoes.length > 0 && (
            <span className="ml-2 text-[#797C7F]">{instrucoes.length}/4000</span>
          )}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={cancelar}
            className="flex-1 rounded-lg border border-[#D8DAF0] bg-white px-3 py-2 text-[12px] text-[#797C7F] transition-colors hover:bg-[#F4F5FB]"
          >
            Cancelar
          </button>
          <button
            onClick={reanalisar}
            className="flex-1 rounded-lg bg-[#3D4392] px-3 py-2 text-[12px] text-white transition-colors hover:bg-[#5258AB]"
          >
            Reanalisar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setAberto(true)}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#D8DAF0] bg-white px-4 py-2.5 text-[13px] text-[#1F2255] transition-colors hover:bg-[#F4F5FB]"
    >
      <svg className="h-3.5 w-3.5 text-[#797C7F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.89" />
      </svg>
      Reanalisar análise
    </button>
  );
}
