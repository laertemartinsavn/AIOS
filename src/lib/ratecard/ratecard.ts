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
