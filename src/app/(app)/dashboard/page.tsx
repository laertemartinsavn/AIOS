import Link from "next/link";
import { ListaChamadas } from "@/components/chamadas/lista-chamadas";
import { StatsCards } from "@/components/chamadas/stats-cards";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { propostasService } from "@/lib/services/propostas.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const [chamadas, relatorios, propostas] = await Promise.all([
    chamadasService.listar(supabase),
    relatoriosService.listar(supabase),
    propostasService.listar(supabase),
  ]);

  const chamadasIdsComRelatorio = new Set(relatorios.map((r) => r.chamada_id));
  const chamadasIdsComProposta = new Set(propostas.map((p) => p.chamada_id));
  const valorEstimadoTotal = relatorios.reduce(
    (sum, r) => sum + Number(r.valor_estimado_brl ?? 0),
    0,
  );

  const linhas = chamadas.slice(0, 10).map((c) => ({
    ...c,
    tem_relatorio: chamadasIdsComRelatorio.has(c.id),
    tem_proposta: chamadasIdsComProposta.has(c.id),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe suas chamadas, análises e propostas comerciais.
          </p>
        </div>
        <Link
          href="/dashboard/chamadas/nova"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          + Nova chamada
        </Link>
      </div>

      <StatsCards
        total={chamadas.length}
        analisadas={chamadasIdsComRelatorio.size}
        propostas={propostas.length}
        valorEstimadoTotal={valorEstimadoTotal}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Chamadas recentes
        </h2>
        <ListaChamadas chamadas={linhas} />
      </section>
    </div>
  );
}
