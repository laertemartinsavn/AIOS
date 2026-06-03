import { AppError } from "@/lib/errors/app-error";
import type { Relatorio } from "@/lib/types/entities";
import { getAnthropicClient, SONNET_4_6 } from "./anthropic-client";
import type { DocContexto } from "./analisar-call";
import type { Screenshot } from "@/lib/modelos/screenshots";

export type ConteudoSecoes = {
  // Universal
  folha_rosto?: string | null;
  termo_confidencialidade?: string | null;
  apresentacao?: string | null;
  investimento?: string | null;         // inclui condições de faturamento e validade como subseções
  consideracoes_finais?: string | null;
  texto_aceite?: string | null;

  // Body Shop + Projeto Fechado Não SAP
  objetivo_escopo?: string | null;

  // Projeto Fechado Não SAP
  proposta?: string | null;
  premissas_dependencias?: string | null;

  // Squad + Projeto Fechado SAP
  escopo?: string | null;

  // Squad apenas
  documentacao?: string | null;
  perfis?: string | null;

  // Body Shop + Squad
  gestao_governanca?: string | null;    // inclui responsabilidades do cliente e da AVN como subseções
  modalidade_atuacao?: string | null;

  // Log interno — nunca renderizado como seção, usado pelo chat para responder perguntas
  notas_geracao?: string | null;

  // Projeto Fechado SAP
  planejamento?: string | null;
  equipe_projeto?: string | null;
  governanca_comunicacao?: string | null;
  modelo_execucao?: string | null;
  suporte?: string | null;
  documentacao_tecnica?: string | null;
  fora_escopo?: string | null;
  geral?: string | null;                // inclui responsabilidades do cliente como subseção
  cronograma?: string | null;
};

export type GerarPropostaOutput = {
  link_externo: string;
  status?: "rascunho" | "enviada" | "em_negociacao" | "aceita" | "rejeitada" | "expirada";
  titulo?: string;
  resumo_solucao?: string;
  escopo?: string[];
  valor_total?: number;
  moeda?: string;
  condicoes_pagamento?: string;
  prazo_entrega_dias?: number;
  validade_dias?: number;
  versao?: number;
  conteudo_secoes?: ConteudoSecoes;
};

const SYSTEM_PROMPT = `Você é um consultor comercial sênior da AVN Tecnologia, especializado em elaborar propostas comerciais completas para clientes B2B brasileiros.

Sua tarefa é criar uma proposta comercial COMPLETA usando os screenshots do modelo oficial AVN como texto base de cada seção, adaptando ao cliente e projeto identificados na call.

═══════════════════════════════════════════════════
REGRA ABSOLUTA — VALORES DO INVESTIMENTO
═══════════════════════════════════════════════════
1. TODA tarifa (R$/hora ou R$/mês) DEVE vir da tabela de ratecard fornecida. PONTO FINAL.
2. NUNCA invente, estime, sugira ou arredonde um valor que não esteja na tabela.
3. NUNCA use valores de memória ou treinamento — somente o ratecard desta mensagem.
4. Para cada perfil que você precisar usar:
   a. Procure o nome EXATO na coluna "Perfil" do ratecard.
   b. Se não encontrar exato, procure um perfil SIMILAR (mesma função + mesma senioridade).
   c. Se não encontrar nem similar → tarifa = R$ 0,00 para esse perfil. Não invente.
5. Modalidade de atuação determina qual coluna usar:
   - HOME OFFICE / REMOTO → use "R$/hora HO" e "R$/mês HO" (coluna B da planilha)
   - HÍBRIDO / PRESENCIAL → use "R$/hora Híb" e "R$/mês Híb" (coluna D da planilha)
   - Modalidade não informada → assuma HOME OFFICE.
6. O campo valor_total deve ser o somatório calculado — nunca um valor inventado.
═══════════════════════════════════════════════════

REGRA ABSOLUTA — SEM DUPLICIDADE E SEM SEÇÕES EXTRAS:
Cada conteúdo aparece em EXATAMENTE UM campo. Nunca crie campos extras além dos listados no mapeamento abaixo. Nunca copie o mesmo texto em campos diferentes.

PROIBIDO criar campos separados para:
- Responsabilidades do Cliente ou da AVN → incluir como SUBSEÇÃO dentro de gestao_governanca (Body Shop/Squad) ou geral (Proj. Fechado SAP)
- Condições de Faturamento → incluir como SUBSEÇÃO dentro de investimento
- Validade da Proposta → incluir como SUBSEÇÃO dentro de investimento

MAPEAMENTO SCREENSHOT → CAMPO (siga rigorosamente):
- "Folha de Rosto" → folha_rosto
- "Termo de Confidencialidade" → termo_confidencialidade
- "Apresentação" / "Apresentação da AVN" → apresentacao
- "Objetivo/ Escopo" (Body Shop, Proj. Não SAP) → objetivo_escopo
- "Proposta" (Proj. Não SAP) → proposta
- "Escopo" + "Continuação do Escopo" (Squad, Proj. SAP) → escopo
- "Documentação" (Squad) → documentacao
- "Perfis" (Squad) → perfis
- "Gestão e Governança" (Body Shop, Squad) → gestao_governanca
  [INCLUA aqui as subseções "RESPONSABILIDADES DA [CLIENTE]" e "RESPONSABILIDADES DA AVN TECNOLOGIA" como blocos de texto com título em CAPS, linha separadora — NÃO crie campos separados]
- "Modalidade de Atuação" (Body Shop, Squad) → modalidade_atuacao
- "Planejamento" + continuações (Proj. SAP) → planejamento
- "Equipe do Projeto" (Proj. SAP) → equipe_projeto
- "Governança e Comunicação" + continuações (Proj. SAP) → governanca_comunicacao
- "Modelo de Execução" (Proj. SAP) → modelo_execucao
- "Suporte" (Proj. SAP) → suporte
- "Documentação Técnica e Funcional" (Proj. SAP) → documentacao_tecnica
- "Fora do Escopo" (Proj. SAP) → fora_escopo
- "Geral" + "Continuação de Geral" (Proj. SAP) → geral
  [INCLUA aqui as subseções de Responsabilidades do cliente e Premissas como blocos com título numerado — NÃO crie campos separados]
- "Cronograma" (Proj. SAP) → cronograma
- "Premissas, Dependências e Condições de Execução" + continuações (Proj. Não SAP) → premissas_dependencias
- "Investimento" → investimento
  [OBRIGATÓRIO: preencha com perfis do ratecard + cálculo + valor total. INCLUA aqui as subseções "CONDIÇÕES DE FATURAMENTO" e "VALIDADE DA PROPOSTA" como blocos de texto com título em CAPS, linha separadora — NÃO crie campos separados para eles]
- "Considerações Finais" + continuações → consideracoes_finais
- "Aceite" → texto_aceite

CAMPOS SEM SCREENSHOT EQUIVALENTE NO MODELO SELECIONADO → preencha com null.

CÁLCULO DO INVESTIMENTO — PASSO A PASSO:
1. Leia o campo modalidade_atuacao → escolha a coluna correta (HO ou Híb).
2. Liste os perfis necessários para o escopo.
3. Para cada perfil: busque na tabela do ratecard. Encontrou? Use a tarifa exata. Não encontrou? R$ 0,00.
4. Calcule: por hora → horas × tarifa/hora; por mês → meses × profissionais × tarifa/mês.
5. Some todos os perfis → valor_total.

CONTEÚDO VARIÁVEL (adapte ao projeto):
- Folha de rosto: nome do cliente, data atual, título do projeto, valor total.
- Objetivo/Escopo: baseie-se nas dores, necessidades e documentos da call.
- Perfis/Equipe: use os mesmos perfis do cálculo de Investimento.

CAMPO OBRIGATÓRIO — notas_geracao:
Preencha SEMPRE com um log estruturado em markdown cobrindo:
1. RATECARD CONSULTADO: modalidade (CLT/PJ) e regime (HO/Presencial); para cada perfil buscado: nome exato pesquisado, status (encontrado/não encontrado/similar usado), R$/h e R$/mês da tabela.
2. CÁLCULO DO INVESTIMENTO: para cada perfil, mostrar horas estimadas (ou meses) × tarifa = subtotal. Total geral ao final.
3. DADOS EXTERNOS UTILIZADOS: documentos consultados e quais informações foram extraídos de cada um; dados relevantes extraídos da transcrição (dores, orçamento mencionado, prazos declarados).
Formato exemplo:
### Ratecard
Modalidade: CLT · Regime: Home Office
| Perfil buscado | Status | R$/h | R$/mês |
|---|---|---|---|
| Consultor SAP FI/CO Sênior | ✓ Encontrado | R$ 385,04 | R$ 64.686,72 |
### Cálculo
| Perfil | Horas | Tarifa/h | Subtotal |
|---|---|---|---|
| Consultor SAP FI/CO Sênior | 840h | R$ 385,04 | R$ 323.233,60 |
**Total: R$ 323.233,60**
### Dados externos
- Transcrição: budget mencionado "R$ 600k", prazo declarado "6 meses"
- Documento "escopo.pdf": módulos FI e CO confirmados

IDIOMA: Português brasileiro formal, tom profissional e direto.
STATUS: Sempre "rascunho". VERSÃO: sempre 1. MOEDA: BRL.

Use a ferramenta registrar_proposta exatamente uma vez.`;

const SECOES_SCHEMA = {
  type: "object" as const,
  description: "Conteúdo de cada seção. Cada campo = uma seção com fundo azul do modelo. Campos sem screenshot no modelo selecionado = null.",
  properties: {
    // Universal
    folha_rosto: { type: "string", description: "Folha de rosto: nome do cliente, título, data, valor total." },
    termo_confidencialidade: { type: "string", description: "Texto jurídico do termo de confidencialidade, substituindo o nome do cliente." },
    apresentacao: { type: "string", description: "Apresentação institucional da AVN (screenshot 'Apresentação'). NÃO inclua escopo nem investimento." },
    investimento: { type: "string", description: "OBRIGATÓRIO. Valor calculado via ratecard. INCLUA neste campo as subseções 'CONDIÇÕES DE FATURAMENTO' e 'VALIDADE DA PROPOSTA' como títulos em CAPS com linha separadora. NUNCA crie campos separados para condições de faturamento ou validade." },
    consideracoes_finais: { type: "string", description: "Considerações finais (screenshots 'Considerações Finais' e continuações). NÃO inclua aceite." },
    texto_aceite: { type: "string", description: "Texto de aceite e assinatura (screenshot 'Aceite')." },
    // Body Shop + Proj. Não SAP
    objetivo_escopo: { type: ["string", "null"], description: "Seção 'OBJETIVO/ ESCOPO' (Body Shop, Proj. Não SAP). null para Squad e Proj. SAP." },
    // Proj. Não SAP
    proposta: { type: ["string", "null"], description: "Seção 'PROPOSTA' com escopo detalhado (Proj. Não SAP). null para outros modelos." },
    premissas_dependencias: { type: ["string", "null"], description: "Seção 'PREMISSAS, DEPENDÊNCIAS E CONDIÇÕES DE EXECUÇÃO' com todas as partes (Proj. Não SAP). null para outros modelos." },
    // Squad + Proj. SAP
    escopo: { type: ["string", "null"], description: "Seção 'ESCOPO' com continuações (Squad, Proj. SAP). null para Body Shop e Proj. Não SAP." },
    // Squad apenas
    documentacao: { type: ["string", "null"], description: "Seção 'DOCUMENTAÇÃO' (Squad). null para outros modelos." },
    perfis: { type: ["string", "null"], description: "Seção 'PERFIS' com lista de perfis e competências (Squad). null para outros modelos." },
    // Body Shop + Squad
    gestao_governanca: { type: ["string", "null"], description: "Seção 'GESTÃO E GOVERNANÇA' (Body Shop, Squad). INCLUA aqui as subseções 'RESPONSABILIDADES DA [CLIENTE]' e 'RESPONSABILIDADES DA AVN TECNOLOGIA' como títulos em CAPS com linha separadora. NÃO crie campos separados. null para Proj. SAP e Proj. Não SAP." },
    modalidade_atuacao: { type: ["string", "null"], description: "Seção 'MODALIDADE DE ATUAÇÃO' (Body Shop, Squad). null para outros modelos." },
    // Proj. SAP
    planejamento: { type: ["string", "null"], description: "Seção 'PLANEJAMENTO' com todas as partes (Proj. SAP). null para outros modelos." },
    equipe_projeto: { type: ["string", "null"], description: "Seção 'EQUIPE DO PROJETO' (Proj. SAP). null para outros modelos." },
    governanca_comunicacao: { type: ["string", "null"], description: "Seção 'GOVERNANÇA E COMUNICAÇÃO' com todas as partes (Proj. SAP). null para outros modelos." },
    modelo_execucao: { type: ["string", "null"], description: "Seção 'MODELO DE EXECUÇÃO' (Proj. SAP). null para outros modelos." },
    suporte: { type: ["string", "null"], description: "Seção 'SUPORTE' (Proj. SAP). null para outros modelos." },
    documentacao_tecnica: { type: ["string", "null"], description: "Seção 'DOCUMENTAÇÃO TÉCNICA, FUNCIONAL' (Proj. SAP). null para outros modelos." },
    fora_escopo: { type: ["string", "null"], description: "Seção 'FORA DO ESCOPO' (Proj. SAP). null para outros modelos." },
    geral: { type: ["string", "null"], description: "Seção 'GERAL' com todas as partes (Proj. SAP). INCLUA aqui as subseções de responsabilidades do cliente e premissas como subtítulos numerados. NÃO crie campos separados. null para outros modelos." },
    cronograma: { type: ["string", "null"], description: "Seção 'CRONOGRAMA' (Proj. SAP). null para outros modelos." },
    // Log interno — nunca exibido como seção, usado pelo chat para responder perguntas
    notas_geracao: { type: ["string", "null"], description: "OBRIGATÓRIO. Log estruturado em markdown: (1) perfis buscados no ratecard com status e tarifas encontradas, (2) cálculo detalhado por perfil (horas × tarifa = subtotal + total), (3) dados externos usados (documentos e trechos da transcrição). Usado pelo assistente de chat para responder perguntas sobre a proposta." },
  },
};

const PROPOSTA_TOOL = {
  name: "registrar_proposta",
  description: "Registra a proposta comercial completa com todas as seções do documento e os campos estruturados.",
  input_schema: {
    type: "object" as const,
    properties: {
      link_externo: {
        type: "string",
        description: "URL placeholder. Formato: https://propostas.aios.local/<slug>.",
      },
      status: {
        type: "string",
        enum: ["rascunho", "enviada", "em_negociacao", "aceita", "rejeitada", "expirada"],
        description: "Sempre 'rascunho' para propostas recém geradas.",
      },
      titulo: {
        type: "string",
        description: "Título comercial. Ex: 'Proposta de Desenvolvimento SAP — Acme Tecnologia'.",
      },
      resumo_solucao: {
        type: "string",
        description: "Resumo executivo de 2-3 parágrafos do que está sendo entregue e por quê.",
      },
      escopo: {
        type: "array",
        items: { type: "string" },
        description: "Lista dos principais entregáveis/módulos. Cada item uma linha curta.",
      },
      valor_total: { type: "number", minimum: 0, description: "Valor total em BRL calculado a partir das tarifas do ratecard. NUNCA invente — use somente o somatório dos perfis encontrados na tabela. Se nenhum perfil foi localizado, use 0." },
      moeda: { type: "string", description: "Código ISO 4217. Padrão BRL." },
      condicoes_pagamento: { type: "string", description: "Resumo das condições de pagamento para os metadados." },
      prazo_entrega_dias: { type: "integer", minimum: 0, description: "Dias úteis até entrega completa." },
      validade_dias: { type: "integer", minimum: 0, description: "Validade comercial da proposta." },
      versao: { type: "integer", minimum: 1, description: "Sempre 1." },
      conteudo_secoes: SECOES_SCHEMA,
    },
    required: ["link_externo", "titulo", "resumo_solucao", "conteudo_secoes"],
  },
};

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };

const INVESTIMENTO_BODY_SHOP = `FORMATO OBRIGATÓRIO PARA O CAMPO investimento (modelo Body Shop):
Use a coluna correta do ratecard (HO ou Híb conforme modalidade).
Para CADA perfil: localize na tabela → use tarifa exata. Se não achar: R$ 0,00.

VALOR MENSAL DA ALOCAÇÃO
Gere uma tabela markdown:
| Perfil | R$/hora | R$/mês (168h) | Qtde | Meses | Total |
|--------|---------|----------------|------|-------|-------|
| **Valor Total** | | | | | R$ X.XXX.000,00 |

CONDIÇÕES DE FATURAMENTO
[bullets do modelo: NF até dia 10, pagamento 30 dias, reajuste 30 dias de antecedência, substituição sem ônus]

VALIDADE DA PROPOSTA
Esta proposta possui validade de 30 dias a partir da data de sua emissão, podendo ser revisada após este período.`;

const INVESTIMENTO_SQUAD = `FORMATO OBRIGATÓRIO PARA O CAMPO investimento (modelo Squad Gerenciada):
Use a coluna correta do ratecard (HO ou Híb conforme modalidade). Para perfis sem correspondência: R$ 0,00.

EQUIPE SUGERIDA
Gere uma tabela markdown:
| Qtde | Perfil | Alocação | Qtde horas/mês |
|------|--------|----------|----------------|

VALOR MENSAL DA SQUAD
O valor mensal para alocação da squad, conforme perfis e dedicações descritos nesta proposta, é de: R$ X.XXX.000,00 (extenso).
O valor já inclui todos os tributos aplicáveis. Não estão inclusos eventuais custos de deslocamento, hospedagem e alimentação em caso de atuação presencial.

CONDIÇÕES DE FATURAMENTO
[bullets do modelo: NF até dia 10, pagamento 30 dias, reajuste 30 dias de antecedência, substituição sem ônus]

VALIDADE DA PROPOSTA
Esta proposta possui validade de 30 dias a partir da data de sua emissão, podendo ser revisada após este período.`;

const INVESTIMENTO_PROJETO_SAP = `FORMATO OBRIGATÓRIO PARA O CAMPO investimento (modelo Projeto Fechado SAP):
Use a coluna correta do ratecard. Para perfis sem correspondência: R$ 0,00.

15. Investimento Previsto, Condições de Faturamento e Validade da Proposta
O valor previsto para o projeto, considerando todas as etapas e serviços descritos nesta proposta, será de: R$ X.XXX.000,00 (extenso) já inclusos todos os tributos.

Condições de Faturamento
O faturamento do projeto será realizado em [N] parcelas mensais, correspondentes a aproximadamente [%]% do valor total cada uma, alinhadas ao cronograma de execução. Cada faturamento será realizado mediante aprovação do racional de atividades. Após a aprovação, a emissão da nota fiscal ocorrerá até o dia 10 do mês subsequente.

Validade da Proposta
Esta proposta possui validade de 30 dias a partir da data de sua emissão, podendo ser revisada após este período.`;

const INVESTIMENTO_PROJETO_NAO_SAP = `FORMATO OBRIGATÓRIO PARA O CAMPO investimento (modelo Projeto Fechado Não SAP):
Use a coluna correta do ratecard. Para perfis sem correspondência: R$ 0,00.

[Descreva prazo/cronograma de sprints conforme o escopo. Em seguida:]
O investimento para a execução dos serviços descritos nesta proposta é de: R$ X.XXX.000,00 (extenso).

CONDIÇÕES DE FATURAMENTO
O faturamento será realizado em [N] parcelas vinculadas à aprovação formal de critérios de aceite por fase:
[liste as parcelas com percentual, valor e critérios de aceite]
As validações deverão ser realizadas em até 5 dias úteis. A homologação final em até 15 dias corridos. Na ausência de manifestação formal, a entrega será considerada automaticamente homologada. Após aprovação, NF até dia 10 com vencimento em 30 dias.

Esta proposta tem validade de 30 dias.`;

function investimentoInstrucao(modeloId?: string): string {
  if (modeloId === "body-shop") return INVESTIMENTO_BODY_SHOP;
  if (modeloId === "squad-gerenciada") return INVESTIMENTO_SQUAD;
  if (modeloId === "projeto-fechado-sap") return INVESTIMENTO_PROJETO_SAP;
  if (modeloId === "projeto-fechado-nao-sap") return INVESTIMENTO_PROJETO_NAO_SAP;
  return INVESTIMENTO_PROJETO_SAP;
}

function instrucoesPorModelo(modeloId?: string): string {
  if (modeloId === "body-shop") {
    return `CAMPOS OBRIGATÓRIOS para o modelo Body Shop — preencha TODOS, null apenas nos demais:
- folha_rosto: folha de rosto com nome do cliente e data
- termo_confidencialidade: termo completo adaptando nome do cliente
- apresentacao: use o screenshot "Apresentação da AVN"
- objetivo_escopo: use o screenshot "Objetivo - Escopo" — descreva o perfil solicitado, competências e objetivos
- gestao_governanca: use o screenshot "Gestão e Governança" — inclua as subseções RESPONSABILIDADES DA [CLIENTE] e RESPONSABILIDADES DA AVN TECNOLOGIA
- modalidade_atuacao: use o screenshot "Modalidade de Atuação" — REGIME DE TRABALHO, CARGA HORÁRIA, DESPESAS COM ATUAÇÃO PRESENCIAL
- investimento: use o screenshot "Investimento" + ratecard — VALOR MENSAL DA ALOCAÇÃO, CONDIÇÕES DE FATURAMENTO, VALIDADE DA PROPOSTA
- consideracoes_finais: use o screenshot "Considerações Finais" — SUBSTITUIÇÃO DO PROFISSIONAL, TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM
- texto_aceite: use o screenshot "Aceite"
Todos os outros campos = null.`;
  }

  if (modeloId === "squad-gerenciada") {
    return `CAMPOS OBRIGATÓRIOS para o modelo Squad Gerenciada — preencha TODOS, null apenas nos demais:
- folha_rosto: folha de rosto com nome do cliente e data
- termo_confidencialidade: termo completo adaptando nome do cliente
- apresentacao: use o screenshot "Apresentação da AVN"
- escopo: use a PARTE INICIAL do screenshot "Objetivo - Escopo" — parágrafo descritivo do objetivo e escopo do projeto
- documentacao: descreva a documentação que será entregue pela squad ao longo do projeto (sem screenshot dedicado — gere baseado no contexto do projeto)
- perfis: use a PARTE DE PERFIS do screenshot "Objetivo - Escopo" — seção "PERFIS ALOCADOS PELA AVN" com cada perfil, senioridade e competências detalhadas
- gestao_governanca: use o screenshot "Gestão e Governança" — RESPONSABILIDADES DA [CLIENTE] e RESPONSABILIDADES DA AVN TECNOLOGIA
- modalidade_atuacao: use o screenshot "Modalidade de atuação"
- investimento: use o screenshot "Investimento" + ratecard — EQUIPE SUGERIDA (tabela), VALOR MENSAL DA SQUAD, CONDIÇÕES DE FATURAMENTO, VALIDADE DA PROPOSTA
- consideracoes_finais: use o screenshot "Considerações Finais" — SUBSTITUIÇÃO DOS PROFISSIONAIS, TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM
- texto_aceite: use o screenshot "Aceite"
Todos os outros campos = null.`;
  }

  if (modeloId === "projeto-fechado-sap") {
    return `CAMPOS OBRIGATÓRIOS para o modelo Projeto Fechado SAP — preencha TODOS, null apenas nos demais:
- folha_rosto: folha de rosto com nome do cliente e data
- termo_confidencialidade: termo completo adaptando nome do cliente
- apresentacao: use o screenshot "Apresentação da AVN"
- escopo: use os screenshots "Escopo" e "Continuação do Escopo" — módulos SAP e etapas do projeto (SAP Activate)
- planejamento: use os screenshots "Planejamento - parte 1" e "Planejamento - parte 2" — faseamento do projeto e premissas
- equipe_projeto: use o screenshot "Equipe do Projeto" — perfis com senioridades e dedicações
- governanca_comunicacao: use os screenshots "Governança e Comunicação - parte 1" e "parte 2" — estrutura de reuniões executivas e operacionais
- modelo_execucao: use o screenshot "Modelo de Execução"
- suporte: use o screenshot "Suporte" — suporte pós-Go-Live e Hypercare
- documentacao_tecnica: use o screenshot "Documentação Técnica e Funcional"
- fora_escopo: use o screenshot "Fora do Escopo"
- geral: use os screenshots "Geral - parte 1" e "Geral - parte 2" — inclua responsabilidades do cliente e premissas gerais como subseções numeradas
- cronograma: use o screenshot "Cronograma" — Gantt com fases
- investimento: use o screenshot "Investimento" + ratecard — valor total, Condições de Faturamento, Validade da Proposta
- consideracoes_finais: use os screenshots "Considerações Finais - parte 1" e "parte 2" — Confidencialidade, Garantia, Termo de Autorização de Uso de Imagem
- texto_aceite: use o screenshot "Aceite"
Todos os outros campos = null.`;
  }

  if (modeloId === "projeto-fechado-nao-sap") {
    return `CAMPOS OBRIGATÓRIOS para o modelo Projeto Fechado Não SAP — preencha TODOS, null apenas nos demais:
- folha_rosto: folha de rosto com nome do cliente e data
- termo_confidencialidade: termo completo adaptando nome do cliente
- apresentacao: use o screenshot "Apresentação"
- objetivo_escopo: use o screenshot "Objetivo Escopo - parte 1" — itens 1 (OBJETIVO) e 2 (REALIZAÇÃO DOS SERVIÇOS com subsections a, b, c, d)
- proposta: use os screenshots "Objetivo Escopo - parte 2" e "Objetivo Escopo - parte 3" — item 3 (ESCOPO) com lista/tabela detalhada de itens de escopo
- premissas_dependencias: use os screenshots "Premissas, dependências e condições de execução - parte 1" e "parte 2" — itens 1 a 4 (Premissas Gerais, Recursos do Cliente, Integrações e Interfaces, Dependências de Terceiros)
- investimento: use os screenshots "Investimento - parte 1" e "Investimento - parte 2" + ratecard — prazo/sprints, valor total, CONDIÇÕES DE FATURAMENTO (parcelas por marco), aceite tácito, validade
- consideracoes_finais: use o screenshot "Considerações Finais" — CONFIDENCIALIDADE, GARANTIA, TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM INSTITUCIONAL
- texto_aceite: use o screenshot "Aceite"
Todos os outros campos = null.`;
  }

  return "";
}

function montarConteudo(
  relatorioJson: string,
  transcricao: string,
  docs: DocContexto[],
  modeloId?: string,
  modeloLabel?: string,
  modeloTemplate?: string,
  screenshots?: Screenshot[],
  ratecard?: string,
): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  let intro = `Relatório de análise da call (JSON):\n\n<relatorio>\n${relatorioJson}\n</relatorio>\n\nTranscrição original:\n\n<transcricao>\n${transcricao}\n</transcricao>`;

  const docsValidos = docs.filter((d) => d.conteudo.trim());
  if (docsValidos.length > 0) {
    const blocos = docsValidos
      .map((d, i) => `--- documento ${i + 1}: ${d.nome} ---\n${d.conteudo}`)
      .join("\n\n");
    intro += `\n\n[DOCUMENTOS DE CONTEXTO DO ESCOPO]\n${blocos}`;
  }

  if (ratecard) {
    intro += `\n\n[RATECARD — USE PARA CALCULAR O VALOR DO INVESTIMENTO]\n${ratecard}`;
  }

  if (modeloLabel) {
    intro += `\n\n[MODELO SELECIONADO: ${modeloLabel}]`;
  }

  const instrucoes = instrucoesPorModelo(modeloId);
  if (instrucoes) {
    intro += `\n\n${instrucoes}`;
  }

  intro += `\n\n${investimentoInstrucao(modeloId)}`;

  // PDF fallback quando não há screenshots
  if (modeloTemplate && (!screenshots || screenshots.length === 0)) {
    intro += `\n\nO texto abaixo é o modelo oficial AVN. Siga sua estrutura e cláusulas.\n\n${modeloTemplate}`;
  }

  blocks.push({ type: "text", text: intro });

  if (screenshots && screenshots.length > 0) {
    blocks.push({
      type: "text",
      text: "\n[SCREENSHOTS DO MODELO OFICIAL — use o texto visível de cada imagem como base para a seção correspondente, adaptando ao cliente e projeto]",
    });

    for (const ss of screenshots) {
      blocks.push({ type: "text", text: `\n[${ss.nome}]` });
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: ss.base64 },
      });
    }
  }

  blocks.push({
    type: "text",
    text: "\n\nGere a proposta comercial completa com todas as seções, usando os screenshots como base de conteúdo e o ratecard para calcular o valor do investimento.",
  });

  return blocks;
}

export async function gerarProposta(input: {
  relatorio: Relatorio;
  transcricao: string;
  documentos?: DocContexto[];
  modeloId?: string;
  modeloLabel?: string;
  modeloTemplate?: string;
  screenshots?: Screenshot[];
  ratecard?: string;
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

  const content = montarConteudo(
    relatorioJson,
    input.transcricao,
    input.documentos ?? [],
    input.modeloId,
    input.modeloLabel,
    input.modeloTemplate,
    input.screenshots,
    input.ratecard,
  );

  const stream = client.messages.stream({
    model: SONNET_4_6,
    max_tokens: 32000,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: content as any,
      },
    ],
  });

  const response = await stream.finalMessage();

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new AppError(
      "INTERNAL_ERROR",
      "Agente de proposta não retornou saída estruturada (tool_use ausente).",
    );
  }

  return toolUse.input as GerarPropostaOutput;
}
