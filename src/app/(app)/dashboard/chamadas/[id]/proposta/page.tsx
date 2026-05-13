import Link from "next/link";
import { PainelProposta } from "@/components/chamadas/painel-proposta";
import { requireUser } from "@/lib/auth/require-user";
import { chamadasService } from "@/lib/services/chamadas.service";
import { propostasService } from "@/lib/services/propostas.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export default async function PropostaPage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const chamada = await chamadasService.obter(supabase, id);
  const propostas = await propostasService.listar(supabase, id);
  const proposta = propostas[0];

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/chamadas/${id}`}
        className="inline-block text-sm text-muted-foreground hover:underline"
      >
        ← Voltar à análise
      </Link>

      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Proposta comercial
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {chamada.titulo}
        </h1>
      </header>

      {!proposta ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">
            Nenhuma proposta gerada ainda para essa chamada.
          </p>
          <Link
            href={`/dashboard/chamadas/${id}`}
            className="mt-3 inline-block text-sm underline"
          >
            Gerar agora
          </Link>
        </div>
      ) : (
        <PainelProposta proposta={proposta} />
      )}
    </div>
  );
}
