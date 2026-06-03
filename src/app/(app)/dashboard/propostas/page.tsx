import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { propostasService } from "@/lib/services/propostas.service";
import { formatarBRL, formatarData } from "@/lib/ui/cores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusBadge(s: string | null) {
  switch (s) {
    case "aceita":        return { label: "Aceita",         cls: "bg-[rgba(76,166,122,.14)] text-[#2F8F5E]" };
    case "em_negociacao": return { label: "Em negociação",  cls: "bg-[rgba(242,139,58,.14)] text-[#B05E1F]" };
    case "enviada":       return { label: "Enviada",        cls: "bg-[#EBECF7] text-[#3D4392]" };
    case "rejeitada":     return { label: "Rejeitada",      cls: "bg-[rgba(200,66,61,.14)] text-[#C8423D]" };
    default:              return { label: "Rascunho",       cls: "bg-[#F1F2F3] text-[#797C7F]" };
  }
}

export default async function PropostasPage() {
  const { supabase } = await requireUser();

  const [chamadas, propostas] = await Promise.all([
    chamadasService.listar(supabase),
    propostasService.listar(supabase),
  ]);

  const chamadaMap = new Map(chamadas.map((c) => [c.id, c]));

  const sorted = [...propostas].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="flex flex-col gap-[18px] p-7">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="font-brand text-[26px] font-bold tracking-tight text-[#1F2255]">
            Propostas
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#44464A]">
            {propostas.length} {propostas.length === 1 ? "proposta gerada" : "propostas geradas"} — clique em uma para ver ou regenerar.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#D8DAF0] bg-white shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
        {sorted.length === 0 ? (
          <div className="px-[22px] py-16 text-center text-[13px] text-[#A9ABAE]">
            Nenhuma proposta ainda.{" "}
            <Link href="/dashboard/analises" className="text-[#3D4392] underline-offset-2 hover:underline">
              Ver análises para gerar uma proposta
            </Link>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F1F2F3]">
                <th className="px-[22px] py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Proposta</th>
                <th className="px-4 py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Status</th>
                <th className="px-4 py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Valor total</th>
                <th className="px-4 py-3.5 font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Versão</th>
                <th className="px-[22px] py-3.5 text-right font-brand text-[11px] font-semibold uppercase tracking-[.08em] text-[#797C7F]">Gerada em</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const chamada = chamadaMap.get(p.chamada_id);
                const st = statusBadge(p.status);
                return (
                  <tr key={p.id} className="border-t border-[#F1F2F3] transition-colors hover:bg-[#F4F5FB]">
                    <td className="px-[22px] py-3.5">
                      <Link
                        href={`/dashboard/chamadas/${p.chamada_id}/proposta`}
                        className="text-[13px] font-medium text-[#1F2255] hover:text-[#3D4392]"
                      >
                        {chamada?.titulo ?? p.titulo ?? "—"}
                      </Link>
                      {p.titulo && chamada?.titulo && p.titulo !== chamada.titulo && (
                        <div className="mt-0.5 truncate text-[11px] text-[#A9ABAE]">{p.titulo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-brand text-[13px] font-semibold text-[#1F2255]">
                      {p.valor_total ? formatarBRL(Number(p.valor_total)) : <span className="font-normal text-[#A9ABAE]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-[#797C7F]">
                      v{p.versao ?? 1}
                    </td>
                    <td className="px-[22px] py-3.5 text-right">
                      <div className="text-[12px] text-[#797C7F]">{formatarData(p.created_at)}</div>
                      <Link
                        href={`/dashboard/chamadas/${p.chamada_id}`}
                        className="mt-0.5 block text-[11px] text-[#3D4392] hover:underline"
                      >
                        Ver análise →
                      </Link>
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
