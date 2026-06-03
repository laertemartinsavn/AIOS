import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { propostasService } from "@/lib/services/propostas.service";
import { formatarBRL, formatarData } from "@/lib/ui/cores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sentimentoBadge(s: string | null) {
  if (s === "positivo") return { label: "Positivo", cls: "bg-[rgba(76,166,122,.14)] text-[#2F8F5E]" };
  if (s === "negativo") return { label: "Negativo", cls: "bg-[rgba(200,66,61,.14)] text-[#C8423D]" };
  return { label: "Neutro", cls: "bg-[#EBECF7] text-[#5E6164]" };
}

export default async function AnalisesPage() {
  const { supabase } = await requireUser();

  const [chamadas, relatorios, propostas] = await Promise.all([
    chamadasService.listar(supabase),
    relatoriosService.listar(supabase),
    propostasService.listar(supabase),
  ]);

  const chamadaMap = new Map(chamadas.map((c) => [c.id, c]));
  const propostaSet = new Set(propostas.map((p) => p.chamada_id));

  const sorted = [...relatorios].sort(
    (a, b) => new Date(b.gerado_em).getTime() - new Date(a.gerado_em).getTime(),
  );

  return (
    <div className="flex flex-col gap-[18px] p-7">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="font-brand text-[26px] font-bold tracking-tight text-[#1F2255]">
            Análises
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#44464A]">
            {relatorios.length} {relatorios.length === 1 ? "análise gerada" : "análises geradas"} — clique em uma para ver detalhes ou gerar proposta.
          </p>
        </div>
        <Link
          href="/dashboard/chamadas/nova"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3D4392] px-4 py-2.5 text-[13px] font-normal text-white transition-colors hover:bg-[#5258AB]"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova análise
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#D8DAF0] bg-white shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
        {sorted.length === 0 ? (
          <div className="px-[22px] py-16 text-center text-[13px] text-[#A9ABAE]">
            Nenhuma análise ainda.{" "}
            <Link href="/dashboard/chamadas/nova" className="text-[#3D4392] underline-offset-2 hover:underline">
              Criar primeira análise
            </Link>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F1F2F3]">
                <th className="px-[22px] py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Análise</th>
                <th className="px-4 py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Sentimento</th>
                <th className="px-4 py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Valor estimado</th>
                <th className="px-4 py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Prob. fechamento</th>
                <th className="px-4 py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Proposta</th>
                <th className="px-[22px] py-3.5 text-right font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Analisada em</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const chamada = chamadaMap.get(r.chamada_id);
                const sent = sentimentoBadge(r.sentimento);
                const temProposta = propostaSet.has(r.chamada_id);
                return (
                  <tr key={r.id} className="border-t border-[#F1F2F3] transition-colors hover:bg-[#F4F5FB]">
                    <td className="px-[22px] py-3.5">
                      <Link
                        href={`/dashboard/chamadas/${r.chamada_id}`}
                        className="text-[13px] font-medium text-[#1F2255] hover:text-[#3D4392]"
                      >
                        {chamada?.titulo ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.sentimento ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sent.cls}`}>
                          {sent.label}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#A9ABAE]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-brand text-[13px] font-semibold text-[#1F2255]">
                      {r.valor_estimado_brl ? formatarBRL(Number(r.valor_estimado_brl)) : <span className="font-normal text-[#A9ABAE]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#44464A]">
                      {r.probabilidade_fechamento != null ? `${r.probabilidade_fechamento}%` : <span className="text-[#A9ABAE]">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {temProposta ? (
                        <Link
                          href={`/dashboard/chamadas/${r.chamada_id}/proposta`}
                          className="rounded-full bg-[#EBECF7] px-2.5 py-0.5 text-[11px] font-medium text-[#3D4392] hover:bg-[#D8DAF0]"
                        >
                          Ver proposta
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/chamadas/${r.chamada_id}`}
                          className="rounded-full bg-[rgba(61,67,146,.10)] px-2.5 py-0.5 text-[11px] font-medium text-[#3D4392] hover:bg-[rgba(61,67,146,.18)]"
                        >
                          Gerar proposta
                        </Link>
                      )}
                    </td>
                    <td className="px-[22px] py-3.5 text-right text-[12px] text-[#797C7F]">
                      {formatarData(r.gerado_em)}
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
