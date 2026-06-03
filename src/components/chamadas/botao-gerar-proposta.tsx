"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MODELOS_PROPOSTA } from "@/lib/modelos/modelos-proposta";
import { BarraProgressoIA } from "@/components/ui/barra-progresso-ia";

export function BotaoGerarProposta({ chamadaId, temProposta = false }: { chamadaId: string; temProposta?: boolean }) {
  const router = useRouter();
  const [modeloId, setModeloId] = useState("");
  const [modalidade, setModalidade] = useState<"CLT" | "PJ">("PJ");
  const [carregando, setCarregando] = useState(false);

  async function aoClicar() {
    if (!modeloId) {
      toast.error("Selecione um modelo de proposta antes de gerar.");
      return;
    }
    if (temProposta && !window.confirm("Isso substituirá a proposta existente. Deseja continuar?")) {
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch(`/api/chamadas/${chamadaId}/gerar-proposta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modeloId, modalidade }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Falha ao gerar proposta.");
      }
      toast.success("Proposta comercial gerada!");
      router.push(`/dashboard/chamadas/${chamadaId}/proposta`);
      router.refresh();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(mensagem);
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="modelo-proposta" className="text-[11px] font-medium text-[#797C7F]">
          Modelo de proposta
        </label>
        <select
          id="modelo-proposta"
          value={modeloId}
          onChange={(e) => setModeloId(e.target.value)}
          disabled={carregando}
          className="w-full rounded-lg border border-[#D8DAF0] bg-[#F4F5FB] px-3 py-2 text-[12px] text-[#1F2255] outline-none focus:border-[#3D4392] focus:ring-2 focus:ring-[#3D4392]/20 disabled:opacity-60"
        >
          <option value="">Selecione um modelo…</option>
          {MODELOS_PROPOSTA.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {modeloId && (
          <p className="text-[11px] text-[#A9ABAE]">
            {MODELOS_PROPOSTA.find((m) => m.id === modeloId)?.descricao}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[#797C7F]">
          Modalidade de contratação
        </label>
        <div className="flex gap-2">
          {(["PJ", "CLT"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={carregando}
              onClick={() => setModalidade(m)}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60 ${
                modalidade === m
                  ? "border-[#3D4392] bg-[#3D4392] text-white"
                  : "border-[#D8DAF0] bg-[#F4F5FB] text-[#1F2255] hover:bg-[#EBECF7]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={aoClicar}
        disabled={carregando || !modeloId}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3D4392] px-4 py-2.5 text-[13px] font-normal text-white shadow-[0_12px_28px_rgba(61,67,146,0.22)] transition-colors hover:bg-[#5258AB] disabled:opacity-60"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {carregando ? "Gerando com IA…" : temProposta ? "Gerar novamente" : "Gerar proposta comercial"}
      </button>

      <BarraProgressoIA
        ativo={carregando}
        estimadoSegundos={90}
        label="Gerando proposta completa com IA…"
      />
    </div>
  );
}
