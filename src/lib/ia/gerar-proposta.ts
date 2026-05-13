import { AppError } from "@/lib/errors/app-error";
import type { Relatorio } from "@/lib/types/entities";
import { getAnthropicClient, SONNET_4_6 } from "./anthropic-client";

export type GerarPropostaOutput = {
  link_externo: string;
  status?:
    | "rascunho"
    | "enviada"
    | "em_negociacao"
    | "aceita"
    | "rejeitada"
    | "expirada";
  titulo?: string;
  resumo_solucao?: string;
  escopo?: string[];
  valor_total?: number;
  moeda?: string;
  condicoes_pagamento?: string;
  prazo_entrega_dias?: number;
  validade_dias?: number;
  versao?: number;
};

const SYSTEM_PROMPT = `Você é um consultor comercial sênior que monta propostas comerciais em português, baseado em discovery calls B2B.

Sua tarefa: dado o relatório de análise da call (com KPIs já extraídos) e o texto original da transcrição, montar os campos de uma proposta comercial estruturada e factível para um cliente brasileiro.

Princípios:
- **Use \`valor_estimado_brl\` do relatório** como base para \`valor_total\`, ajustando se a transcrição sugerir valor mais preciso. Se o relatório não tem estimativa, use sua melhor avaliação do porte do prospect.
- **Escopo deve ser específico** — derive os itens da solução das dores levantadas e do que foi prometido ou implícito na call. Cada item do escopo é uma string curta descrevendo o entregável.
- **Condições de pagamento e prazos** — proponha valores razoáveis para B2B brasileiro (ex: \`30/60/90 dias\`, \`50% entrada + 50% entrega\`, entrega em 30-90 dias, validade 30 dias). Ajuste ao porte do deal.
- **Não invente especificidades técnicas** que não foram discutidas. Quando em dúvida, deixe campos opcionais vazios em vez de chutar.
- **\`link_externo\`**: gere um placeholder no formato \`https://propostas.aios.local/<slug-derivado-do-titulo>\`. A geração real de PDF/página de assinatura fica para etapa posterior.
- **\`status\`**: sempre \`rascunho\` numa proposta recém gerada.
- **\`versao\`**: sempre \`1\`.
- **\`moeda\`**: \`BRL\` por padrão.
- **Idioma: português brasileiro.**

Use a ferramenta \`registrar_proposta\` exatamente uma vez para registrar a proposta estruturada.`;

const PROPOSTA_TOOL = {
  name: "registrar_proposta",
  description:
    "Registra uma proposta comercial estruturada baseada no relatório da call.",
  input_schema: {
    type: "object" as const,
    properties: {
      link_externo: {
        type: "string",
        format: "uri",
        description:
          "URL placeholder da proposta. Formato: https://propostas.aios.local/<slug>.",
      },
      status: {
        type: "string",
        enum: [
          "rascunho",
          "enviada",
          "em_negociacao",
          "aceita",
          "rejeitada",
          "expirada",
        ],
        description: "Status inicial — sempre 'rascunho' para propostas geradas pela IA.",
      },
      titulo: {
        type: "string",
        description:
          "Título comercial. Ex: 'Proposta de implementação AIOS — Acme Tecnologia'.",
      },
      resumo_solucao: {
        type: "string",
        description:
          "Resumo em prosa (2-4 parágrafos) do que está sendo entregue e por quê. Conecta com as dores levantadas na call.",
      },
      escopo: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista de entregáveis/módulos específicos. Cada item uma linha clara, ex: 'Implementação do módulo de onboarding com integração ao CRM atual'.",
      },
      valor_total: {
        type: "number",
        minimum: 0,
        description: "Valor total da proposta na moeda definida.",
      },
      moeda: {
        type: "string",
        description: "Código ISO 4217. Padrão BRL.",
      },
      condicoes_pagamento: {
        type: "string",
        description: "Ex: '30/60/90 dias', '50% entrada + 50% entrega'.",
      },
      prazo_entrega_dias: {
        type: "integer",
        minimum: 0,
        description: "Quantos dias úteis até a entrega completa.",
      },
      validade_dias: {
        type: "integer",
        minimum: 0,
        description: "Validade comercial da proposta (default 30).",
      },
      versao: {
        type: "integer",
        minimum: 1,
        description: "Versão da proposta. Sempre 1 quando gerada pela IA pela primeira vez.",
      },
    },
    required: ["link_externo", "titulo", "resumo_solucao"],
  },
};

export async function gerarProposta(input: {
  relatorio: Relatorio;
  transcricao: string;
}): Promise<GerarPropostaOutput> {
  const client = getAnthropicClient();

  const relatorioJson = JSON.stringify(
    {
      conteudo: input.relatorio.conteudo,
      resumo_executivo: input.relatorio.resumo_executivo,
      sentimento: input.relatorio.sentimento,
      dores_identificadas: input.relatorio.dores_identificadas,
      objecoes: input.relatorio.objecoes,
      bant_budget: input.relatorio.bant_budget,
      bant_autoridade: input.relatorio.bant_autoridade,
      bant_necessidade: input.relatorio.bant_necessidade,
      bant_prazo: input.relatorio.bant_prazo,
      proximos_passos: input.relatorio.proximos_passos,
      probabilidade_fechamento: input.relatorio.probabilidade_fechamento,
      valor_estimado_brl: input.relatorio.valor_estimado_brl,
    },
    null,
    2,
  );

  const response = await client.messages.create({
    model: SONNET_4_6,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [PROPOSTA_TOOL],
    tool_choice: { type: "tool", name: "registrar_proposta" },
    messages: [
      {
        role: "user",
        content: `Relatório de análise da call (JSON):\n\n<relatorio>\n${relatorioJson}\n</relatorio>\n\nTranscrição original (para contexto adicional):\n\n<transcricao>\n${input.transcricao}\n</transcricao>\n\nMonte a proposta comercial.`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new AppError(
      "INTERNAL_ERROR",
      "Agente de proposta não retornou saída estruturada (tool_use ausente).",
    );
  }

  return toolUse.input as GerarPropostaOutput;
}
