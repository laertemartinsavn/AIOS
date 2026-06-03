import fs from "fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { AppError, errorResponse } from "@/lib/errors/app-error";
import { chamadasService } from "@/lib/services/chamadas.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { transcricoesService } from "@/lib/services/transcricoes.service";
import { propostasService } from "@/lib/services/propostas.service";
import { gerarProposta } from "@/lib/ia/gerar-proposta";
import { documentosRepo } from "@/lib/repositories/documentos.repo";
import { encontrarModelo, caminhoModelo } from "@/lib/modelos/modelos-proposta";
import { lerScreenshots } from "@/lib/modelos/screenshots";
import { lerRatecard } from "@/lib/ratecard/ratecard";
import { extrairTexto } from "@/lib/services/extracao-texto.service";

const bodySchema = z.object({
  modeloId: z.string().min(1, "Modelo de proposta obrigatório."),
  modalidade: z.enum(["CLT", "PJ"]).default("PJ"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { supabase } = await requireUser();

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Payload inválido", parsed.error.flatten());
    }

    const modelo = encontrarModelo(parsed.data.modeloId);
    const modalidade = parsed.data.modalidade;
    if (!modelo) {
      throw new AppError("VALIDATION_ERROR", `Modelo "${parsed.data.modeloId}" não encontrado.`);
    }

    await chamadasService.obter(supabase, id);

    const relatorios = await relatoriosService.listar(supabase, id);
    if (relatorios.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Chamada ainda não foi analisada — gere o relatório primeiro.",
      );
    }
    const relatorio = relatorios[0];

    const transcricoes = await transcricoesService.listar(supabase, id);
    if (transcricoes.length === 0) {
      throw new AppError("VALIDATION_ERROR", "Chamada não tem transcrição registrada.");
    }
    const transcricao = transcricoes[0];

    const docs = await documentosRepo.listarPorChamada(supabase, id);
    const docContextos = docs
      .filter((d) => d.conteudo_texto)
      .map((d) => ({ nome: d.nome_arquivo, conteudo: d.conteudo_texto! }));

    // Carrega screenshots do modelo (principal fonte de conteúdo)
    const screenshots = await lerScreenshots(modelo.id);

    // Fallback para texto do PDF se não houver screenshots
    let modeloTemplate: string | undefined;
    if (screenshots.length === 0) {
      try {
        const pdfBuffer = await fs.readFile(caminhoModelo(modelo));
        const texto = await extrairTexto(pdfBuffer, "application/pdf");
        if (texto) modeloTemplate = texto;
      } catch (err) {
        console.error("[modelo] falha ao ler PDF do modelo:", err);
      }
    }

    // Ratecard para cálculo de investimento — usa a aba CLT ou PJ conforme selecionado
    let ratecard: string | undefined;
    try {
      const rc = lerRatecard(modalidade);
      if (rc) ratecard = rc;
    } catch (err) {
      console.error("[ratecard] falha ao ler planilha:", err);
    }

    const propostaIA = await gerarProposta({
      relatorio,
      transcricao: transcricao.conteudo,
      documentos: docContextos,
      modeloId: modelo.id,
      modeloLabel: modelo.label,
      modeloTemplate,
      screenshots: screenshots.length > 0 ? screenshots : undefined,
      ratecard,
    });

    // Apaga proposta existente (se houver) antes de criar a nova
    const propostasExistentes = await propostasService.listar(supabase, id);
    for (const p of propostasExistentes) {
      await propostasService.remover(supabase, p.id);
    }

    const proposta = await propostasService.criar(supabase, {
      chamada_id: id,
      ...propostaIA,
    });

    return NextResponse.json({ proposta }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
