import Link from "next/link";
import { BotaoGerarProposta } from "@/components/chamadas/botao-gerar-proposta";
import { BotaoReanalisar } from "@/components/chamadas/botao-reanalisar";
import { ChatAnalise } from "@/components/chamadas/chat-analise";
import { PainelAnalise } from "@/components/chamadas/painel-analise";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { propostasService } from "@/lib/services/propostas.service";
import { documentosRepo } from "@/lib/repositories/documentos.repo";
import { formatarBRL, formatarData } from "@/lib/ui/cores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

function sentimentoCls(s: string | null) {
  if (s === "positivo") return "bg-[rgba(76,166,122,.22)] text-[#B0F0CC]";
  if (s === "negativo") return "bg-[rgba(200,66,61,.22)] text-[#FFB3B0]";
  return "bg-white/10 text-white/80";
}

function sentimentoLabel(s: string | null) {
  if (s === "positivo") return "Sentimento positivo";
  if (s === "negativo") return "Sentimento negativo";
  return "Sentimento neutro";
}

export default async function ChamadaDetalhePage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const chamada = await chamadasService.obter(supabase, id);
  const [relatorios, propostas, documentos] = await Promise.all([
    relatoriosService.listar(supabase, id),
    propostasService.listar(supabase, id),
    documentosRepo.listarPorChamada(supabase, id),
  ]);

  const relatorio = relatorios[0];
  const proposta = propostas[0];

  return (
    <div className="flex flex-col gap-[18px] p-7">
      {/* Hero */}
      <div className="rounded-2xl bg-[#1F2255] px-8 py-7 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-white/70">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
              Análise
            </div>
            {relatorio?.sentimento && (
              <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${sentimentoCls(relatorio.sentimento)}`}>
                {sentimentoLabel(relatorio.sentimento)}
              </span>
            )}
          </div>
          <Link
            href="/dashboard"
            className="text-[12px] text-white/50 transition-colors hover:text-white/80"
          >
            ← Voltar
          </Link>
        </div>

        <h2 className="mt-4 font-brand text-[22px] font-bold leading-tight tracking-tight">
          {chamada.titulo}
        </h2>

        {relatorio?.resumo_executivo && (
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/75">
            {relatorio.resumo_executivo.slice(0, 200)}
            {relatorio.resumo_executivo.length > 200 ? "…" : ""}
          </p>
        )}

        {/* Meta grid */}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6">
          <div>
            <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Status</div>
            <div className="mt-0.5 text-[13px] font-medium text-white">{chamada.status}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Criada em</div>
            <div className="mt-0.5 text-[13px] font-medium text-white">
              {formatarData(chamada.created_at)}
            </div>
          </div>
          {relatorio?.valor_estimado_brl && (
            <div>
              <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Valor estimado</div>
              <div className="mt-0.5 text-[18px] font-brand font-bold text-white">
                {formatarBRL(Number(relatorio.valor_estimado_brl))}
              </div>
            </div>
          )}
          {relatorio?.probabilidade_fechamento != null && (
            <div>
              <div className="text-[10px] uppercase tracking-[.12em] text-white/45">Prob. fechamento</div>
              <div className="mt-0.5 text-[18px] font-brand font-bold text-white">
                {relatorio.probabilidade_fechamento}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {!relatorio ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#D8DAF0] bg-white p-10 text-center">
          <svg className="h-10 w-10 text-[#B9BCE2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="font-brand text-[15px] font-semibold text-[#1F2255]">Análise não disponível</p>
          <p className="text-[13px] text-[#797C7F]">
            Ocorreu um problema durante a geração da análise.
          </p>
          <div className="mt-2">
            <BotaoReanalisar chamadaId={id} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[1fr_300px]">
          {/* Main column */}
          <div className="flex flex-col gap-[18px]">
            <PainelAnalise relatorio={relatorio} />
            <ChatAnalise chamadaId={id} />
          </div>

          {/* Aside */}
          <aside className="flex flex-col gap-[18px]">
            {/* Actions */}
            <div className="rounded-2xl border border-[#D8DAF0] bg-white p-5 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
              <div className="mb-3 font-brand text-[13px] font-semibold text-[#1F2255]">Ações</div>
              <div className="flex flex-col gap-2">
                {proposta && (
                  <Link
                    href={`/dashboard/chamadas/${id}/proposta`}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#3D4392] px-4 py-2.5 text-[13px] font-normal text-white shadow-[0_12px_28px_rgba(61,67,146,0.22)] transition-colors hover:bg-[#5258AB]"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Ver proposta
                  </Link>
                )}
                <BotaoGerarProposta chamadaId={id} temProposta={!!proposta} />
                <BotaoReanalisar chamadaId={id} />
              </div>
            </div>

            {/* Documentos */}
            {documentos.length > 0 && (
              <div className="rounded-2xl border border-[#D8DAF0] bg-white p-5 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
                <div className="mb-3 font-brand text-[13px] font-semibold text-[#1F2255]">Documentos</div>
                <div className="flex flex-col gap-2">
                  {documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 shrink-0 text-[#3D4392]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] text-[#1F2255]">{doc.nome_arquivo}</p>
                        <p className="text-[11px] text-[#A9ABAE]">
                          {doc.tamanho_bytes < 1024
                            ? `${doc.tamanho_bytes} B`
                            : doc.tamanho_bytes < 1048576
                            ? `${(doc.tamanho_bytes / 1024).toFixed(0)} KB`
                            : `${(doc.tamanho_bytes / 1048576).toFixed(1)} MB`}
                          {!doc.conteudo_texto && " · extração indisponível"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="rounded-2xl border border-[#D8DAF0] bg-white p-5 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
              <div className="mb-3 font-brand text-[13px] font-semibold text-[#1F2255]">Detalhes</div>
              <div className="flex flex-col gap-2.5">
                <KvRow label="ID da análise" value={chamada.id.slice(0, 8) + "…"} mono />
                <KvRow label="Status" value={chamada.status ?? "—"} />
                <KvRow label="Criada em" value={formatarData(chamada.created_at)} />
                {relatorio && (
                  <>
                    <KvRow label="Relatório" value={relatorio.id.slice(0, 8) + "…"} mono />
                    <KvRow label="Analisada em" value={formatarData(relatorio.gerado_em)} />
                  </>
                )}
              </div>
            </div>

            {/* History */}
            <div className="rounded-2xl border border-[#D8DAF0] bg-white p-5 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
              <div className="mb-3 font-brand text-[13px] font-semibold text-[#1F2255]">Histórico</div>
              <div className="flex flex-col gap-2">
                <HistItem label="Análise criada" date={formatarData(chamada.created_at)} done />
                {relatorio && (
                  <HistItem label="Análise gerada" date={formatarData(relatorio.gerado_em)} done />
                )}
                {proposta && (
                  <HistItem label={`Proposta v${proposta.versao} gerada`} date={formatarData(proposta.created_at)} done />
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

function HistItem({ label, date, done }: { label: string; date: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
            done ? "bg-[rgba(76,166,122,.14)]" : "bg-[#EBECF7]"
          }`}
        >
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
