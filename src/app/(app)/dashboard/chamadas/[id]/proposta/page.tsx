import Link from "next/link";
import { ChatProposta } from "@/components/chamadas/chat-proposta";
import { PainelProposta } from "@/components/chamadas/painel-proposta";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { propostasService } from "@/lib/services/propostas.service";
import { formatarBRL, formatarData } from "@/lib/ui/cores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

function statusCls(s: string | null) {
  switch (s) {
    case "aceita":        return "bg-[rgba(76,166,122,.22)] text-[#B0F0CC]";
    case "em_negociacao": return "bg-[rgba(242,139,58,.24)] text-[#FFD9B3]";
    case "enviada":       return "bg-white/15 text-white/90";
    case "rejeitada":     return "bg-[rgba(200,66,61,.22)] text-[#FFB3B0]";
    default:              return "bg-white/10 text-white/75";
  }
}

function statusLabel(s: string | null) {
  switch (s) {
    case "aceita":        return "Aceita";
    case "em_negociacao": return "Em negociação";
    case "enviada":       return "Enviada";
    case "rejeitada":     return "Rejeitada";
    case "rascunho":      return "Rascunho";
    default:              return s ?? "—";
  }
}

export default async function PropostaPage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const chamada = await chamadasService.obter(supabase, id);
  const propostas = await propostasService.listar(supabase, id);
  const proposta = propostas[0];

  return (
    <div className="flex flex-col gap-[18px] p-7">
      {/* Hero */}
      <div className="rounded-2xl bg-[#1F2255] px-8 py-7 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-white/70">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Proposta comercial{proposta ? ` · v${proposta.versao}` : ""}
            </div>
            {proposta?.status && (
              <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${statusCls(proposta.status)}`}>
                {statusLabel(proposta.status)}
              </span>
            )}
          </div>
          <Link
            href={`/dashboard/chamadas/${id}`}
            className="text-[12px] text-white/50 transition-colors hover:text-white/80"
          >
            ← Voltar à análise
          </Link>
        </div>

        <h2 className="mt-4 font-brand text-[22px] font-bold leading-tight tracking-tight">
          {proposta?.titulo ?? chamada.titulo}
        </h2>

        {proposta?.resumo_solucao && (
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/75">
            {proposta.resumo_solucao.slice(0, 200)}
            {proposta.resumo_solucao.length > 200 ? "…" : ""}
          </p>
        )}

        {/* Meta grid */}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6">
          <div>
            <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Cliente / Análise</div>
            <div className="mt-0.5 text-[13px] font-medium text-white">{chamada.titulo}</div>
          </div>
          {proposta && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Criada em</div>
                <div className="mt-0.5 text-[13px] font-medium text-white">
                  {formatarData(proposta.created_at)}
                </div>
              </div>
              {proposta.prazo_entrega_dias && (
                <div>
                  <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Prazo de entrega</div>
                  <div className="mt-0.5 text-[13px] font-medium text-white">
                    {proposta.prazo_entrega_dias} dias
                  </div>
                </div>
              )}
              {proposta.valor_total && (
                <div>
                  <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Valor total</div>
                  <div className="mt-0.5 text-[18px] font-brand font-bold text-white">
                    {formatarBRL(Number(proposta.valor_total))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {!proposta ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#D8DAF0] bg-white p-10 text-center">
          <svg className="h-10 w-10 text-[#B9BCE2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="font-brand text-[15px] font-semibold text-[#1F2255]">Nenhuma proposta gerada</p>
          <p className="text-[13px] text-[#797C7F]">
            Volte à análise para gerar uma proposta comercial.
          </p>
          <Link
            href={`/dashboard/chamadas/${id}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#3D4392] px-4 py-2.5 text-[13px] text-white transition-colors hover:bg-[#5258AB]"
          >
            Ir para análise
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[1fr_300px]">
          {/* Main column */}
          <div className="flex flex-col gap-[18px]">
            <PainelProposta proposta={proposta} />
            <ChatProposta chamadaId={id} />
          </div>

          {/* Aside */}
          <aside className="flex flex-col gap-[18px]">
            {/* Details */}
            <div className="rounded-2xl border border-[#D8DAF0] bg-white p-5 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
              <div className="mb-3 font-brand text-[13px] font-semibold text-[#1F2255]">Detalhes</div>
              <div className="flex flex-col gap-2.5">
                <KvRow label="ID" value={proposta.id.slice(0, 8) + "…"} mono />
                <KvRow label="Versão" value={`v${proposta.versao}`} />
                <KvRow label="Status" value={statusLabel(proposta.status)} />
                <KvRow label="Validade" value={proposta.validade_dias ? `${proposta.validade_dias} dias` : "—"} />
                <KvRow label="Moeda" value={proposta.moeda ?? "BRL"} />
                {proposta.enviada_em && (
                  <KvRow label="Enviada em" value={formatarData(proposta.enviada_em)} />
                )}
                <KvRow label="Criada em" value={formatarData(proposta.created_at)} />
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-[#D8DAF0] bg-white p-5 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
              <div className="mb-3 font-brand text-[13px] font-semibold text-[#1F2255]">Exportar</div>
              <div className="flex flex-col gap-2">
                <a
                  href={`/api/chamadas/${id}/proposta/exportar?formato=docx`}
                  download
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#3D4392] px-4 py-2.5 text-[13px] text-white shadow-[0_4px_12px_rgba(61,67,146,0.18)] transition-colors hover:bg-[#5258AB]"
                >
                  <WordIcon />
                  Exportar para Word
                </a>
                <a
                  href={`/api/chamadas/${id}/proposta/exportar?formato=pdf`}
                  download
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#D8DAF0] bg-white px-4 py-2.5 text-[13px] text-[#1F2255] transition-colors hover:bg-[#F4F5FB]"
                >
                  <PdfIcon />
                  Exportar para PDF
                </a>
              </div>
              <div className="mt-3 border-t border-[#EBECF7] pt-3">
                <Link
                  href={`/dashboard/chamadas/${id}`}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#D8DAF0] px-4 py-2.5 text-[13px] text-[#1F2255] transition-colors hover:bg-[#F4F5FB]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  Ver análise original
                </Link>
              </div>
            </div>

            {/* History */}
            <div className="rounded-2xl border border-[#D8DAF0] bg-white p-5 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
              <div className="mb-3 font-brand text-[13px] font-semibold text-[#1F2255]">Histórico</div>
              <div className="flex flex-col gap-2">
                <HistItem label="Proposta criada" date={formatarData(proposta.created_at)} done />
                {proposta.enviada_em && (
                  <HistItem label="Proposta enviada" date={formatarData(proposta.enviada_em)} done />
                )}
                {proposta.status === "aceita" && (
                  <HistItem label="Proposta aceita" date="—" done />
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function KvRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[12px] text-[#797C7F]">{label}</span>
      <span className={`text-right text-[12px] font-medium text-[#1F2255] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function WordIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function HistItem({ label, date, done }: { label: string; date: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${done ? "bg-[rgba(76,166,122,.14)]" : "bg-[#EBECF7]"}`}>
          {done && (
            <svg className="h-2.5 w-2.5 text-[#2F8F5E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span className="text-[12px] text-[#44464A]">{label}</span>
      </div>
      <span className="text-[11px] text-[#797C7F]">{date}</span>
    </div>
  );
}
