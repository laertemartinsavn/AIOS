import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { AppError, errorResponse } from "@/lib/errors/app-error";
import { chamadasService } from "@/lib/services/chamadas.service";
import { transcricoesService } from "@/lib/services/transcricoes.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { relatoriosRepo } from "@/lib/repositories/relatorios.repo";
import { analisarCall } from "@/lib/ia/analisar-call";

const bodySchema = z.object({
  instrucoes: z.string().max(4000).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { supabase } = await requireUser();

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    const instrucoes = parsed.success ? parsed.data.instrucoes : undefined;

    await chamadasService.obter(supabase, id);

    const transcricoes = await transcricoesService.listar(supabase, id);
    if (transcricoes.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Chamada não tem transcrição registrada.",
      );
    }

    const analise = await analisarCall(transcricoes[0].conteudo, [], instrucoes);

    const relatoriosExistentes = await relatoriosService.listar(supabase, id);

    let relatorio;
    if (relatoriosExistentes.length > 0) {
      relatorio = await relatoriosRepo.atualizar(
        supabase,
        relatoriosExistentes[0].id,
        analise,
      );
    } else {
      relatorio = await relatoriosService.criar(supabase, {
        chamada_id: id,
        ...analise,
      });
    }

    await chamadasService.atualizar(supabase, id, { status: "analisada" });

    return NextResponse.json({ relatorio });
  } catch (err) {
    return errorResponse(err);
  }
}
