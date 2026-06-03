import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { AppError, errorResponse } from "@/lib/errors/app-error";
import { chamadasService } from "@/lib/services/chamadas.service";
import { transcricoesService } from "@/lib/services/transcricoes.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { getAnthropicClient, SONNET_4_6 } from "@/lib/ia/anthropic-client";

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

    const [transcricoes, relatorios] = await Promise.all([
      transcricoesService.listar(supabase, id),
      relatoriosService.listar(supabase, id),
    ]);

    if (transcricoes.length === 0) {
      throw new AppError("NOT_FOUND", "Chamada não tem transcrição registrada.");
    }
    if (relatorios.length === 0) {
      throw new AppError("NOT_FOUND", "Chamada ainda não foi analisada.");
    }

    const transcricao = transcricoes[0].conteudo;
    const rel = relatorios[0];

    const systemPrompt = `Você é um assistente especializado em análise de calls de vendas B2B da AVN Tecnologia. Você tem acesso à transcrição completa da call e ao relatório de análise gerado pela IA.

<transcricao>
${transcricao}
</transcricao>

<relatorio>
${JSON.stringify(
  {
    resumo_executivo: rel.resumo_executivo,
    sentimento: rel.sentimento,
    dores_identificadas: rel.dores_identificadas,
    objecoes: rel.objecoes,
    bant_budget: rel.bant_budget,
    bant_autoridade: rel.bant_autoridade,
    bant_necessidade: rel.bant_necessidade,
    bant_prazo: rel.bant_prazo,
    proximos_passos: rel.proximos_passos,
    probabilidade_fechamento: rel.probabilidade_fechamento,
    valor_estimado_brl: rel.valor_estimado_brl,
    conteudo: rel.conteudo,
  },
  null,
  2,
)}
</relatorio>

Responda perguntas sobre esta análise de forma objetiva e precisa:
- Ao citar evidências, use trechos exatos da transcrição entre aspas
- Se um valor foi estimado (não mencionado explicitamente), explique o racional usado
- Se algo não está na transcrição ou no relatório, diga claramente
- Idioma: português brasileiro`;

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
