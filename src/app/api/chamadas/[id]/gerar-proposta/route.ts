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
import { lerRatecard, lerLinhasRatecard, recalcularInvestimento, formatarInvestimento } from "@/lib/ratecard/ratecard";
import { extrairTexto } from "@/lib/services/extracao-texto.service";

function inferirRegime(modalidadeAtuacao: string, transcricao: string): "Hib" | "HO" {
  const texto = `${modalidadeAtuacao}\n${transcricao}`.toLowerCase();
  if (/presencial|híbrido|hibrido|híb/i.test(texto)) return "Hib";
  if (/home[\s-]*office|remoto/i.test(texto)) return "HO";
  return "HO";
}

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

    // Log para diagnóstico
    // A IA pode retornar `perfis_selecionados` como string JSON — parse quando necessário
    let perfisSelecionados: any = propostaIA.perfis_selecionados ?? null;
    if (typeof perfisSelecionados === "string") {
      try {
        perfisSelecionados = JSON.parse(perfisSelecionados);
      } catch (e) {
        console.warn("[gerar-proposta] falha ao parsear perfis_selecionados:", e);
        perfisSelecionados = null;
      }
    }
    console.log("[gerar-proposta] perfis_selecionados:", JSON.stringify(perfisSelecionados ?? null));
    console.log("[gerar-proposta] perfis_count:", perfisSelecionados ? perfisSelecionados.length : 0);
    try {
      const linhasCount = lerLinhasRatecard(modalidade).length;
      console.log("[gerar-proposta] ratecard_linhas_count:", linhasCount);
    } catch (e) {
      console.log("[gerar-proposta] falha ao contar linhas do ratecard:", String(e));
    }
    console.log("[gerar-proposta] cwd:", process.cwd());
    console.log("[gerar-proposta] modalidade:", modalidade);
    console.log("[gerar-proposta] modalidade_atuacao:", propostaIA.conteudo_secoes?.modalidade_atuacao);

    // Calcula investimento em código — valores corretos do ratecard, sem depender da IA
    if (perfisSelecionados && Array.isArray(perfisSelecionados) && perfisSelecionados.length > 0) {
      const modalidadeAtuacao = propostaIA.conteudo_secoes?.modalidade_atuacao ?? "";
      const regime = inferirRegime(modalidadeAtuacao, transcricao.conteudo);
      const usarValorMensal = modelo.id === "body-shop" || modelo.id === "squad-gerenciada";
      const calc = recalcularInvestimento(
        perfisSelecionados,
        modalidade,
        regime,
        { mensal: usarValorMensal },
      );

      console.log("[gerar-proposta] cálculo investimento:", {
        regime,
        usarValorMensal,
        itens: calc.itens.map(i => ({
          perfil: i.perfil_original,
          quantidade: i.quantidade,
          horas_mensais: i.horas_mensais,
          meses: i.meses,
          tarifa_hora: i.tarifa_hora,
          tarifa_mensal_168: i.tarifa_mensal_168,
          tarifa_mensal_proporcional: i.tarifa_mensal_proporcional,
          subtotal: i.subtotal,
          encontrado: i.encontrado,
        })),
        valor_total: calc.valor_total,
      });

      propostaIA.valor_total = calc.valor_total;
      if (propostaIA.conteudo_secoes) {
        propostaIA.conteudo_secoes.investimento = formatarInvestimento(
          calc,
          modelo.id,
          propostaIA.conteudo_secoes.investimento,
        );
      }
    } else {
      console.warn("[gerar-proposta] AVISO: perfis_selecionados vazio ou não preenchido pela IA");
    }

    // Apaga proposta existente (se houver) antes de criar a nova
    const propostasExistentes = await propostasService.listar(supabase, id);
    for (const p of propostasExistentes) {
      await propostasService.remover(supabase, p.id);
    }

    // perfis_selecionados é campo interno de cálculo — não persiste no banco
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { perfis_selecionados: _, ...propostaParaSalvar } = propostaIA;

    console.log("[gerar-proposta] ANTES DE SALVAR no banco:", {
      valor_total: propostaParaSalvar.valor_total,
      titulo: propostaParaSalvar.titulo,
      status: propostaParaSalvar.status,
      investimento_preview: propostaParaSalvar.conteudo_secoes?.investimento?.substring(0, 100),
    });

    const proposta = await propostasService.criar(supabase, {
      chamada_id: id,
      ...propostaParaSalvar,
    });

    console.log("[gerar-proposta] APOS SALVAR no banco:", {
      id: proposta.id,
      valor_total: proposta.valor_total,
    });

    return NextResponse.json({ proposta }, { status: 201 });
  } catch (err) {
    // Log detalhado para diagnóstico
    console.error("[gerar-proposta] ERRO DETALHADO:", {
      type: typeof err,
      constructor: (err as object)?.constructor?.name,
      message: (err as Error)?.message,
      status: (err as Record<string, unknown>)?.status,
      error: (err as Record<string, unknown>)?.error,
      cause: (err as Record<string, unknown>)?.cause,
      keys: err && typeof err === "object" ? Object.keys(err as object) : [],
      stringified: (() => { try { return JSON.stringify(err); } catch { return String(err); } })(),
    });
    return errorResponse(err);
  }
}
