import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BotaoGerarProposta } from "@/components/chamadas/botao-gerar-proposta";
import { PainelAnalise } from "@/components/chamadas/painel-analise";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { propostasService } from "@/lib/services/propostas.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export default async function ChamadaDetalhePage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const chamada = await chamadasService.obter(supabase, id);
  const relatorios = await relatoriosService.listar(supabase, id);
  const propostas = await propostasService.listar(supabase, id);

  const relatorio = relatorios[0];
  const proposta = propostas[0];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-block text-sm text-muted-foreground hover:underline"
      >
        ← Voltar ao dashboard
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{chamada.titulo}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{chamada.status}</Badge>
          </div>
        </div>
      </div>

      {!relatorio ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">Análise ainda não disponível.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Algo deu errado durante a geração. Crie uma nova chamada para tentar de novo.
          </p>
        </div>
      ) : (
        <>
          <PainelAnalise relatorio={relatorio} />

          <div className="flex justify-end pt-4">
            {proposta ? (
              <Link
                href={`/dashboard/chamadas/${id}/proposta`}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Ver proposta →
              </Link>
            ) : (
              <BotaoGerarProposta chamadaId={id} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
