import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { propostasService } from "@/lib/services/propostas.service";
import { formatarBRL, formatarData } from "@/lib/ui/cores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sentimentoLabel(s: string | null) {
  if (s === "positivo") return { label: "Positivo", cls: "bg-[rgba(76,166,122,.14)] text-[#2F8F5E]" };
  if (s === "negativo") return { label: "Negativo", cls: "bg-[rgba(200,66,61,.14)] text-[#C8423D]" };
  return { label: "Neutro", cls: "bg-[#EBECF7] text-[#5E6164]" };
}

function statusPropostaLabel(s: string | null) {
  switch (s) {
    case "aceita":       return { label: "Aceita",         cls: "bg-[rgba(76,166,122,.14)] text-[#2F8F5E]" };
    case "em_negociacao": return { label: "Em negociação", cls: "bg-[rgba(242,139,58,.14)] text-[#B05E1F]" };
    case "enviada":     return { label: "Enviada",         cls: "bg-[#EBECF7] text-[#3D4392]" };
    case "rejeitada":   return { label: "Rejeitada",       cls: "bg-[rgba(200,66,61,.14)] text-[#C8423D]" };
    default:            return { label: "Rascunho",        cls: "bg-[#F1F2F3] text-[#797C7F]" };
  }
}

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const [chamadas, relatorios, propostas] = await Promise.all([
    chamadasService.listar(supabase),
    relatoriosService.listar(supabase),
    propostasService.listar(supabase),
  ]);

  const chamadaMap = new Map(chamadas.map((c) => [c.id, c]));

  const valorEstimadoTotal = relatorios.reduce(
    (sum, r) => sum + Number(r.valor_estimado_brl ?? 0),
    0,
  );

  const recentRelatorios = [...relatorios]
    .sort((a, b) => new Date(b.gerado_em).getTime() - new Date(a.gerado_em).getTime())
    .slice(0, 5);

  const recentPropostas = [...propostas]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const mesAtual = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-[18px] p-7">
      {/* Page header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="font-brand text-[11px] font-semibold uppercase tracking-[.18em] text-[#3D4392]">
            {mesAtual}
          </div>
          <h1 className="mt-1.5 font-brand text-[26px] font-bold tracking-tight text-[#1F2255]">
            Resultado do período
          </h1>
          <p className="mt-1.5 max-w-[540px] text-[13px] leading-relaxed text-[#44464A]">
            Análises e propostas comerciais geradas a partir de gravações ou transcrições.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-[18px] xl:grid-cols-4">
        <KpiCard
          label="Transcrições"
          value={chamadas.length}
          badge="Total"
          badgeCls="bg-[#EBECF7] text-[#5E6164]"
          sub={`${chamadas.length} registradas no sistema`}
        />
        <KpiCard
          label="Análises geradas"
          value={relatorios.length}
          badge="IA"
          badgeCls="bg-[#EBECF7] text-[#3D4392]"
          sub={`${chamadas.length - relatorios.length} análises pendentes`}
        />
        <KpiCard
          label="Propostas geradas"
          value={propostas.length}
          badge="BRL"
          badgeCls="bg-[#D2EEF9] text-[#0780AC]"
          sub={`${relatorios.length - propostas.length} análises sem proposta`}
        />
        <KpiCard
          label="Valor estimado total"
          value={formatarBRL(valorEstimadoTotal)}
          badge="BRL"
          badgeCls="bg-[#EBECF7] text-[#5E6164]"
          sub="Soma dos valores estimados pela IA"
          isText
        />
      </div>

      {/* Recent lists — 2 columns */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        {/* Recent analyses */}
        <RecentCard
          title="Análises recentes"
          sub="Últimas análises geradas"
          empty={recentRelatorios.length === 0}
          emptyText="Nenhuma análise ainda."
        >
          {recentRelatorios.map((r) => {
            const chamada = chamadaMap.get(r.chamada_id);
            const sent = sentimentoLabel(r.sentimento);
            return (
              <Link
                key={r.id}
                href={`/dashboard/chamadas/${r.chamada_id}`}
                className="flex items-center justify-between gap-4 border-t border-[#F1F2F3] px-[22px] py-3.5 transition-colors hover:bg-[#F4F5FB]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[#1F2255]">
                    {chamada?.titulo ?? "—"}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[#797C7F]">
                    {formatarData(r.gerado_em)}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {r.sentimento && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sent.cls}`}>
                      {sent.label}
                    </span>
                  )}
                  {r.valor_estimado_brl && (
                    <span className="font-brand text-[12.5px] font-semibold text-[#1F2255]">
                      {formatarBRL(Number(r.valor_estimado_brl))}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </RecentCard>

        {/* Recent proposals */}
        <RecentCard
          title="Propostas recentes"
          sub="Última versão de cada proposta"
          empty={recentPropostas.length === 0}
          emptyText="Nenhuma proposta ainda."
        >
          {recentPropostas.map((p) => {
            const chamada = chamadaMap.get(p.chamada_id);
            const st = statusPropostaLabel(p.status);
            return (
              <Link
                key={p.id}
                href={`/dashboard/chamadas/${p.chamada_id}/proposta`}
                className="flex items-center justify-between gap-4 border-t border-[#F1F2F3] px-[22px] py-3.5 transition-colors hover:bg-[#F4F5FB]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[#1F2255]">
                    {chamada?.titulo ?? p.titulo ?? "—"}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[#797C7F]">
                    v{p.versao} · {formatarData(p.created_at)}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}>
                    {st.label}
                  </span>
                  {p.valor_total && (
                    <span className="font-brand text-[12.5px] font-semibold text-[#1F2255]">
                      {formatarBRL(Number(p.valor_total))}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </RecentCard>
      </div>

      {/* All calls */}
      <div className="overflow-hidden rounded-2xl border border-[#D8DAF0] bg-white shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
        <div className="flex items-center justify-between gap-3 px-[22px] py-[18px]">
          <div>
            <div className="font-brand text-[14px] font-semibold text-[#1F2255]">
              Todas as análises
            </div>
            <div className="mt-0.5 text-[12px] text-[#797C7F]">
              {chamadas.length} {chamadas.length === 1 ? "registro" : "registros"}
            </div>
          </div>
          <Link
            href="/dashboard/chamadas/nova"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3D4392] px-3 py-2 text-[12px] font-normal text-white transition-colors hover:bg-[#5258AB]"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova análise
          </Link>
        </div>

        {chamadas.length === 0 ? (
          <div className="border-t border-[#F1F2F3] px-[22px] py-10 text-center text-[13px] text-[#A9ABAE]">
            Nenhuma análise registrada.{" "}
            <Link href="/dashboard/chamadas/nova" className="text-[#3D4392] underline-offset-2 hover:underline">
              Criar agora
            </Link>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-t border-[#F1F2F3]">
                <th className="px-[22px] py-3 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Título</th>
                <th className="px-4 py-3 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Status</th>
                <th className="px-4 py-3 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Análise</th>
                <th className="px-4 py-3 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Proposta</th>
                <th className="px-[22px] py-3 text-right font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {chamadas.map((c) => {
                const temRelatorio = relatorios.some((r) => r.chamada_id === c.id);
                const temProposta = propostas.some((p) => p.chamada_id === c.id);
                return (
                  <tr
                    key={c.id}
                    className="border-t border-[#F1F2F3] transition-colors hover:bg-[#F4F5FB]"
                  >
                    <td className="px-[22px] py-3.5">
                      <Link
                        href={`/dashboard/chamadas/${c.id}`}
                        className="text-[13px] font-medium text-[#1F2255] hover:text-[#3D4392]"
                      >
                        {c.titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      {temRelatorio ? (
                        <span className="rounded-full bg-[rgba(76,166,122,.14)] px-2.5 py-0.5 text-[11px] font-medium text-[#2F8F5E]">
                          Gerada
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#A9ABAE]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {temProposta ? (
                        <span className="rounded-full bg-[#EBECF7] px-2.5 py-0.5 text-[11px] font-medium text-[#3D4392]">
                          Gerada
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#A9ABAE]">—</span>
                      )}
                    </td>
                    <td className="px-[22px] py-3.5 text-right text-[12px] text-[#797C7F]">
                      {formatarData(c.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  badge,
  badgeCls,
  sub,
  isText = false,
}: {
  label: string;
  value: number | string;
  badge: string;
  badgeCls: string;
  sub: string;
  isText?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-[#D8DAF0] bg-white p-[22px] shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
      <div className="flex items-center justify-between">
        <div className="font-brand text-[13px] font-semibold text-[#1F2255]">{label}</div>
        <span className={`rounded-full px-2.5 py-1 font-brand text-[11px] font-semibold ${badgeCls}`}>
          {badge}
        </span>
      </div>
      <div
        className={`font-brand font-bold leading-none tracking-tight text-[#1F2255] ${
          isText ? "text-[22px]" : "text-[30px]"
        }`}
      >
        {value}
      </div>
      <div className="text-[11.5px] leading-relaxed text-[#797C7F]">{sub}</div>
    </div>
  );
}

function RecentCard({
  title,
  sub,
  empty,
  emptyText,
  children,
}: {
  title: string;
  sub: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8DAF0] bg-white shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
      <div className="px-[22px] pt-[22px]">
        <div className="font-brand text-[14px] font-semibold text-[#1F2255]">{title}</div>
        <div className="mt-0.5 text-[12px] text-[#797C7F]">{sub}</div>
      </div>
      <div className="mt-3">
        {empty ? (
          <div className="border-t border-[#F1F2F3] px-[22px] py-6 text-[13px] text-[#A9ABAE]">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "analisada") {
    return (
      <span className="rounded-full bg-[#EBECF7] px-2.5 py-0.5 text-[11px] font-medium text-[#3D4392]">
        Analisada
      </span>
    );
  }
  if (status === "erro") {
    return (
      <span className="rounded-full bg-[rgba(200,66,61,.14)] px-2.5 py-0.5 text-[11px] font-medium text-[#C8423D]">
        Erro
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[#D8DAF0] px-2.5 py-0.5 text-[11px] font-medium text-[#797C7F]">
      {status ?? "—"}
    </span>
  );
}
