import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { AppError, errorResponse } from "@/lib/errors/app-error";
import { chamadasService } from "@/lib/services/chamadas.service";
import { transcricoesService } from "@/lib/services/transcricoes.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { propostasService } from "@/lib/services/propostas.service";
import { getAnthropicClient, SONNET_4_6 } from "@/lib/ia/anthropic-client";
import type { ConteudoSecoes } from "@/lib/ia/gerar-proposta";

const mensagemSchema = z.object({
  papel: z.enum(["usuario", "assistente"]),
  conteudo: z.string().max(8000),
});

const bodySchema = z.object({
  pergunta: z.string().min(1).max(2000),
  historico: z.array(mensagemSchema).max(40).default([]),
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
    const { pergunta, historico } = parsed.data;

    await chamadasService.obter(supabase, id);

    const [transcricoes, relatorios, propostas] = await Promise.all([
      transcricoesService.listar(supabase, id),
      relatoriosService.listar(supabase, id),
      propostasService.listar(supabase, id),
    ]);

    if (propostas.length === 0) {
      throw new AppError("NOT_FOUND", "Nenhuma proposta encontrada para esta chamada.");
    }
    if (transcricoes.length === 0) {
      throw new AppError("NOT_FOUND", "Não tem transcrição registrada.");
    }

    const proposta = propostas[0];
    const transcricao = transcricoes[0].conteudo;
    const rel = relatorios[0] ?? null;
    const secoes = proposta.conteudo_secoes as ConteudoSecoes | null | undefined;

    const systemPrompt = `Você é um assistente especializado em propostas comerciais B2B da AVN Tecnologia. Você tem acesso à proposta gerada pela IA, à transcrição original e ao relatório de análise.

Responda perguntas sobre esta proposta de forma objetiva e precisa:
- Ao explicar valores, use o log de geração (campo notas_geracao) para mostrar exatamente quais perfis foram usados, quais tarifas do ratecard foram aplicadas e o cálculo completo
- Ao citar o embasamento do escopo, referencie trechos da transcrição entre aspas
- Se algo foi inferido pela IA (não mencionado explicitamente), explique o racional
- Se uma informação não consta na proposta nem na transcrição, diga claramente
- Idioma: português brasileiro

<proposta>
Título: ${proposta.titulo ?? "—"}
Resumo da solução: ${proposta.resumo_solucao ?? "—"}
Escopo: ${JSON.stringify(proposta.escopo ?? [])}
Valor total: ${proposta.valor_total != null ? `R$ ${Number(proposta.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "não informado"}
Prazo de entrega: ${proposta.prazo_entrega_dias ? `${proposta.prazo_entrega_dias} dias` : "não informado"}
Validade: ${proposta.validade_dias ? `${proposta.validade_dias} dias` : "não informado"}
Condições de pagamento: ${proposta.condicoes_pagamento ?? "não informado"}
${secoes ? `
Seções da proposta:
- Objetivo/Escopo: ${secoes.objetivo_escopo ?? secoes.escopo ?? "—"}
- Proposta/Escopo detalhado: ${secoes.proposta ?? "—"}
- Investimento: ${secoes.investimento ?? "—"}
- Gestão e Governança: ${secoes.gestao_governanca ?? secoes.geral ?? "—"}
- Perfis: ${secoes.perfis ?? "—"}
${secoes.notas_geracao ? `
LOG DE GERAÇÃO (ratecard consultado, cálculos e fontes utilizadas):
${secoes.notas_geracao}
` : ""}` : ""}
</proposta>
${rel ? `
<analise>
Resumo executivo: ${rel.resumo_executivo ?? "—"}
Dores identificadas: ${JSON.stringify(rel.dores_identificadas ?? [])}
BANT — Orçamento: ${rel.bant_budget ?? "não identificado"}
BANT — Prazo: ${rel.bant_prazo ?? "não identificado"}
Valor estimado na análise: ${rel.valor_estimado_brl != null ? `R$ ${Number(rel.valor_estimado_brl).toLocaleString("pt-BR")}` : "não estimado"}
</analise>` : ""}

<transcricao>
${transcricao}
</transcricao>`;

    const messages = [
      ...historico.map((m) => ({
        role: m.papel === "usuario" ? ("user" as const) : ("assistant" as const),
        content: m.conteudo,
      })),
      { role: "user" as const, content: pergunta },
    ];

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: SONNET_4_6,
      max_tokens: 2048,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages,
    });

    const texto = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ resposta: texto });
  } catch (err) {
    return errorResponse(err);
  }
}
