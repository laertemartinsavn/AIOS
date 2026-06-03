import * as XLSX from "xlsx";
import path from "path";

function brl(n: number): string {
  const s = n.toFixed(2).replace(".", ",");
  return "R$ " + s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export type LinhaRatecard = {
  perfil: string;
  horaHO: number;
  mensalHO: number;
  horaHib: number;
  mensalHib: number;
};

/** Retorna as linhas da aba CLT ou PJ com as quatro tarifas. */
export function lerLinhasRatecard(modalidade: "CLT" | "PJ" = "PJ"): LinhaRatecard[] {
  const arquivo = path.join(
    process.cwd(),
    "Ratecard",
    "Rate Card - PJ e CLT - Oficial.xlsx",
  );

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(arquivo);
  } catch {
    return [];
  }

  const nomeAba = modalidade === "CLT" ? "Rate Formatado CLT" : "Rate Formatado PJ";
  const ws = wb.Sheets[nomeAba];
  if (!ws) return [];

  const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: "" });

  const linhas: LinhaRatecard[] = [];

  // Dados começam na linha 5 (índice 4), após os cabeçalhos
  for (const row of data.slice(4)) {
    const perfil = String(row[0] ?? "").trim();
    const horaHO = Number(row[1]);   // coluna B — tarifa home office R$/hora
    const mensalHO = Number(row[2]); // coluna C — tarifa home office R$/mês
    const horaHib = Number(row[3]);  // coluna D — tarifa híbrido/presencial R$/hora
    const mensalHib = Number(row[4]);// coluna E — tarifa híbrido/presencial R$/mês

    if (!perfil || !horaHO || horaHO <= 0) continue;

    linhas.push({ perfil, horaHO, mensalHO, horaHib, mensalHib });
  }

  return linhas;
}

export type ItemCalculado = {
  perfil_original: string;
  perfil_ratecard: string;
  quantidade: number;
  horas_mensais: number;
  meses: number;
  tarifa_hora: number;
  tarifa_mensal_168: number;      // tarifa base a 168h
  tarifa_mensal_proporcional: number; // ajustada pelas horas_mensais
  subtotal: number;               // tarifa calculada em R$/mês ou total de contrato, dependendo do modo
  encontrado: boolean;
};

export type RecalcularInvestimentoOptions = {
  mensal?: boolean;
};

export type ResultadoCalculoInvestimento = {
  itens: ItemCalculado[];
  valor_total: number;
};

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

function buscarPerfil(nome: string, linhas: LinhaRatecard[]): LinhaRatecard | undefined {
  const n = normalizar(nome);
  // 1. Match exato (case/acento-insensitive)
  const exato = linhas.find((l) => normalizar(l.perfil) === n);
  if (exato) return exato;
  // 2. Linha que contém o nome como substring
  const parcial = linhas.find((l) => normalizar(l.perfil).includes(n));
  if (parcial) return parcial;
  // 3. Nome contém o perfil da linha
  const invertido = linhas.find((l) => n.includes(normalizar(l.perfil)));
  if (invertido) return invertido;

  // 4. Fallback por similaridade de tokens: use o perfil que compartilha mais palavras.
  const palavras = n.split(/\s+/).filter(Boolean);
  let melhor: { linha: LinhaRatecard; score: number } | undefined;
  for (const linha of linhas) {
    const perfilNormalizado = normalizar(linha.perfil);
    const matches = palavras.filter((p) => perfilNormalizado.includes(p)).length;
    const score = matches / Math.max(palavras.length, 1);
    if (score > 0 && (!melhor || score > melhor.score)) {
      melhor = { linha, score };
    }
  }

  return melhor?.linha;
}

/**
 * Recebe a lista de perfis escolhidos pela IA, busca as tarifas no ratecard
 * e retorna os valores corretos calculados em código.
 */
export function recalcularInvestimento(
  perfis: Array<{ perfil: string; quantidade: number; horas_mensais: number; meses: number }>,
  modalidade: "CLT" | "PJ" = "PJ",
  regime: "HO" | "Hib" = "HO",
  options: RecalcularInvestimentoOptions = {},
): ResultadoCalculoInvestimento {
  const linhas = lerLinhasRatecard(modalidade);
  const itens: ItemCalculado[] = [];
  const mensal = options.mensal === true;

  console.log("[recalcularInvestimento] debug:", {
    perfisCount: perfis.length,
    ratecardLinhasCount: linhas.length,
    modalidade,
    regime,
    mensal,
  });

  for (const p of perfis) {
    const linha = buscarPerfil(p.perfil, linhas);
    const tarifaHora = linha ? (regime === "HO" ? linha.horaHO : linha.horaHib) : 0;
    const tarifaMensal168 = linha ? (regime === "HO" ? linha.mensalHO : linha.mensalHib) : 0;
    const horasMensais = Math.max(1, Number(p.horas_mensais) || 1);
    const meses = Math.max(1, Number(p.meses) || 1);
    const quantidade = Math.max(1, Number(p.quantidade) || 1);
    const proporcao = horasMensais / 168;
    const tarifaMensalProp = tarifaMensal168 * proporcao;
    const subtotal = tarifaMensalProp * quantidade * (mensal ? 1 : meses);

    console.log("[recalcularInvestimento] perfil debug:", {
      perfil_original: p.perfil,
      perfil_encontrado: linha?.perfil ?? "NÃO ENCONTRADO",
      quantidade,
      horas_mensais: horasMensais,
      meses,
      regime,
      tarifaHora,
      tarifaMensal168,
      proporcao,
      tarifaMensalProp,
      subtotal,
    });

    itens.push({
      perfil_original: p.perfil,
      perfil_ratecard: linha?.perfil ?? p.perfil,
      quantidade,
      horas_mensais: horasMensais,
      meses,
      tarifa_hora: tarifaHora,
      tarifa_mensal_168: tarifaMensal168,
      tarifa_mensal_proporcional: tarifaMensalProp,
      subtotal,
      encontrado: !!linha,
    });
  }

  const valor_total = itens.reduce((s, i) => s + i.subtotal, 0);
  console.log("[recalcularInvestimento] resultado final:", { itensCount: itens.length, valor_total });
  return { itens, valor_total };
}

/** Formata a seção investimento com valores calculados pelo sistema. */
export function formatarInvestimento(
  resultado: ResultadoCalculoInvestimento,
  modeloId: string,
  investimentoBase?: string | null,
): string {
  const { itens, valor_total } = resultado;

  const tabelaLinhas = itens.map((i) => {
    const alocacao = i.horas_mensais === 168 ? "Full-time" : `Part-time (${i.horas_mensais}h/mês)`;
    return `| ${i.perfil_ratecard} | ${i.quantidade} | ${alocacao} | ${i.meses} | ${brl(i.tarifa_mensal_proporcional)} | ${brl(i.subtotal)} |`;
  });

  const tabela = [
    "| Perfil | Qtde | Alocação | Meses | R$/mês | Total |",
    "|---|---|---|---|---|---|",
    ...tabelaLinhas,
    `| **TOTAL** | | | | | **${brl(valor_total)}** |`,
  ].join("\n");

  const valorTexto = modeloId === "body-shop"
    ? `O valor mensal da alocação é de: **${brl(valor_total)}** (${brlExtenso(valor_total)}).`
    : modeloId === "squad-gerenciada"
      ? `O valor mensal da squad é de: **${brl(valor_total)}** (${brlExtenso(valor_total)}).`
      : `O valor previsto para o projeto é de: **${brl(valor_total)}** (${brlExtenso(valor_total)}), já inclusos todos os tributos aplicáveis.`;

  if (modeloId === "body-shop") {
    return [
      "VALOR MENSAL DA ALOCAÇÃO",
      "",
      tabela,
      "",
      valorTexto,
      "O valor já inclui todos os tributos aplicáveis.",
      "",
      ...(investimentoBase ? extrairSecoesFaturamento(investimentoBase) : [
        "CONDIÇÕES DE FATURAMENTO",
        "",
        "• O faturamento será realizado mensalmente, mediante emissão de nota fiscal até o dia 10 de cada mês de competência;",
        "• O pagamento deverá ser realizado em até 30 dias após a emissão da nota fiscal;",
        "• Eventuais reajustes após o período inicial poderão ser negociados com antecedência de 30 dias.",
        "",
        "VALIDADE DA PROPOSTA",
        "",
        "Esta proposta possui validade de 30 dias a partir da data de sua emissão.",
      ]),
    ].join("\n");
  }

  return [
    modeloId === "squad-gerenciada"
      ? "EQUIPE SUGERIDA / VALOR MENSAL DA SQUAD"
      : "15. Investimento Previsto, Condições de Faturamento e Validade da Proposta",
    "",
    valorTexto,
    "",
    ...(investimentoBase ? extrairSecoesFaturamento(investimentoBase) : [
      "Condições de Faturamento",
      "",
      "O faturamento do projeto será realizado em parcelas alinhadas ao cronograma de execução, mediante aprovação do racional de atividades. A emissão da nota fiscal ocorrerá até o dia 10 do mês subsequente.",
      "",
      "Validade da Proposta",
      "",
      "Esta proposta possui validade de 30 dias a partir da data de sua emissão.",
    ]),
  ].join("\n");
}

/** Extrai as subseções de faturamento/validade do texto gerado pela IA (se houver). */
function extrairSecoesFaturamento(investimentoBase: string): string[] {
  const linhas = investimentoBase.split("\n");
  const inicio = linhas.findIndex((l) =>
    /condições de faturamento|validade da proposta|condições gerais/i.test(l),
  );
  if (inicio === -1) return [];
  return linhas.slice(inicio);
}

function brlExtenso(n: number): string {
  // Extenso simplificado — retorna apenas "ver proposta" para valores muito grandes
  if (n <= 0) return "zero reais";
  const inteiro = Math.round(n);
  return `${inteiro.toLocaleString("pt-BR")} reais`;
}

/** Serializa o ratecard para ser enviado à IA como contexto. */
export function lerRatecard(modalidade: "CLT" | "PJ" = "PJ"): string {
  const linhas = lerLinhasRatecard(modalidade);
  if (linhas.length === 0) return "";

  const tabela = [
    `RATECARD ${modalidade} — BASE 168 h/mês`,
    "",
    "ATENÇÃO — REGRA DE TARIFA:",
    "• Modalidade HOME OFFICE ou REMOTO → use as colunas 'R$/hora HO' e 'R$/mês HO'",
    "• Modalidade HÍBRIDO ou PRESENCIAL → use as colunas 'R$/hora Híb' e 'R$/mês Híb'",
    "Verifique o campo modalidade_atuacao do projeto ANTES de calcular.",
    "",
    "Perfil | R$/hora HO | R$/mês HO | R$/hora Híb | R$/mês Híb",
    "--- | --- | --- | --- | ---",
    ...linhas.map(
      (l) =>
        `${l.perfil} | ${brl(l.horaHO)} | ${brl(l.mensalHO)} | ${brl(l.horaHib)} | ${brl(l.mensalHib)}`,
    ),
  ];

  return tabela.join("\n");
}
