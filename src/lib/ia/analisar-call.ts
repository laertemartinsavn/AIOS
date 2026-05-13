import { AppError } from "@/lib/errors/app-error";
import { getAnthropicClient, SONNET_4_6 } from "./anthropic-client";

export type AnaliseCallOutput = {
  conteudo: string;
  resumo_executivo?: string;
  sentimento?: "positivo" | "neutro" | "negativo";
  dores_identificadas?: string[];
  objecoes?: string[];
  bant_budget?: string;
  bant_autoridade?: string;
  bant_necessidade?: string;
  bant_prazo?: string;
  proximos_passos?: string[];
  probabilidade_fechamento?: number;
  valor_estimado_brl?: number;
};

const SYSTEM_PROMPT = `Você é um analista sênior de vendas B2B especializado em interpretar discovery calls em português.

Sua tarefa: dada a transcrição completa de uma call de vendas, extrair os principais indicadores estruturados (KPIs) e produzir uma análise narrativa que ajude o vendedor a:
1. Entender rapidamente o que aconteceu na call.
2. Identificar próximos passos e probabilidade de fechamento.
3. Manter um registro estruturado para dashboard e analytics.

Princípios:
- **Não invente.** Preencha cada campo SOMENTE se a transcrição der evidências claras. Se um campo BANT (orçamento, autoridade, necessidade, prazo) não foi mencionado, omita-o em vez de inventar.
- **Seja factual.** Cite frases ou tópicos da call no campo \`conteudo\`.
- **Tom objetivo.** Sem floreios — esse texto vai pra um CRM, não pra marketing.
- **Idioma: português brasileiro.**
- **Probabilidade**: 0-100. Considere sinais de compra (urgência, decisor presente, orçamento confirmado, dor clara) vs. sinais de cautela.
- **Valor estimado**: em BRL. Só preencha se a call tiver mencionado tamanho do deal ou se a empresa do prospect der pistas claras de porte.

Use a ferramenta \`registrar_analise\` exatamente uma vez para registrar a análise estruturada.`;

const ANALISE_TOOL = {
  name: "registrar_analise",
  description:
    "Registra a análise estruturada da call de vendas com KPIs e resumo narrativo.",
  input_schema: {
    type: "object" as const,
    properties: {
      conteudo: {
        type: "string",
        description:
          "Análise narrativa completa da call em markdown (3-6 parágrafos). Cubra: contexto da empresa do prospect, dores levantadas, fit com a solução, sinais positivos e negativos, recomendação para o vendedor. Esta é a fonte de verdade longa do relatório.",
      },
      resumo_executivo: {
        type: "string",
        description:
          "Síntese de 3-5 linhas para o vendedor reler rapidamente antes do follow-up.",
      },
      sentimento: {
        type: "string",
        enum: ["positivo", "neutro", "negativo"],
        description: "Termômetro geral da conversa.",
      },
      dores_identificadas: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista de pain points específicos levantados pelo prospect, em uma frase curta cada.",
      },
      objecoes: {
        type: "array",
        items: { type: "string" },
        description:
          "Resistências, dúvidas ou bloqueios que o prospect levantou (preço, timing, autonomia, integração, etc.).",
      },
      bant_budget: {
        type: "string",
        description:
          "Orçamento: tem? Quanto? Quando libera? Omita se a call não tocou nesse ponto.",
      },
      bant_autoridade: {
        type: "string",
        description:
          "Quem decide? O prospect é o decisor final ou precisa envolver outras pessoas? Omita se não discutido.",
      },
      bant_necessidade: {
        type: "string",
        description:
          "Quão urgente e real é a dor? Há um problema agudo ou exploração de mercado? Omita se não claro.",
      },
      bant_prazo: {
        type: "string",
        description:
          "Quando precisa estar implementado / em produção? Omita se não discutido.",
      },
      proximos_passos: {
        type: "array",
        items: { type: "string" },
        description:
          "Ações combinadas ao fim da call. Inclua quem faz o quê e prazo, se mencionado.",
      },
      probabilidade_fechamento: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Score 0-100 de probabilidade de fechamento, considerando todos os sinais.",
      },
      valor_estimado_brl: {
        type: "number",
        minimum: 0,
        description:
          "Ticket potencial estimado em BRL. Omita se não houver pistas claras.",
      },
    },
    required: ["conteudo", "resumo_executivo", "sentimento"],
  },
};

export async function analisarCall(
  transcricao: string,
): Promise<AnaliseCallOutput> {
  const client = getAnthropicClient();

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
    tools: [ANALISE_TOOL],
    tool_choice: { type: "tool", name: "registrar_analise" },
    messages: [
      {
        role: "user",
        content: `Analise a transcrição abaixo:\n\n<transcricao>\n${transcricao}\n</transcricao>`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new AppError(
      "INTERNAL_ERROR",
      "Agente de análise não retornou saída estruturada (tool_use ausente).",
    );
  }

  return toolUse.input as AnaliseCallOutput;
}
