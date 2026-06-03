import fs from "fs";
import path from "path";
import {
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  convertInchesToTwip,
  PageBreak,
} from "docx";
import type { Proposta } from "@/lib/types/entities";
import type { ConteudoSecoes } from "@/lib/ia/gerar-proposta";
import { formatarBRL } from "@/lib/ui/cores";

// 1×1 transparent PNG — fallback para ambientes que não suportam SVG
const FALLBACK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=",
  "base64",
);

// ── Paleta de cores (hex sem #) ─────────────────────────────────
const AZUL = "3D4392";   // cor oficial AVN (Pantone 19-3955 TCX)
const TEXTO = "888888";  // corpo principal — Arial Nova Light 10 #888888
const CINZA = "888888";  // sub-headings, metadados
const LINHA = "DDDDE0";  // separadores

// ── Layout ───────────────────────────────────────────────────────
const MARGEM_TWIPS = 851;      // 1.5 cm em twips
const PAGE_W_TWIPS = 11906;    // largura A4 em twips (21 cm)
const LOGO_COL_TWIPS = 1900;   // coluna branca do logo (~3.35 cm)

// ── Bordas nulas ─────────────────────────────────────────────────
const BORDA_NENHUMA = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const BORDAS_NENHUMA = {
  top: BORDA_NENHUMA,
  bottom: BORDA_NENHUMA,
  left: BORDA_NENHUMA,
  right: BORDA_NENHUMA,
};

// ── Tipos ────────────────────────────────────────────────────────
type Bloco =
  | { tipo: "paragrafo" | "bullet" | "titulo_num" | "titulo_caps"; texto: string }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] };

function parseCells(linha: string): string[] {
  return linha.split("|").slice(1, -1).map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^[-: ]+$/.test(c));
}

// ── Parser de texto ──────────────────────────────────────────────
function parsear(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  const partes = texto.split("\n\n");

  for (const parte of partes) {
    const trimado = parte.trim();
    if (!trimado) continue;

    const linhas = trimado.split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) continue;

    // Markdown table: primeira linha começa com |
    if (linhas[0].startsWith("|")) {
      const rows = linhas.map(parseCells);
      const cabecalho = rows[0] ?? [];
      const dataLinhas = rows.slice(1).filter((r) => !isSeparatorRow(r));
      blocos.push({ tipo: "tabela", cabecalho, linhas: dataLinhas });
      continue;
    }

    for (const l of linhas) {
      if (!l) continue;

      if (/^[•\-\*]\s+/.test(l)) {
        blocos.push({ tipo: "bullet", texto: l.replace(/^[•\-\*]\s+/, "") });
        continue;
      }

      if (/^\d+\.\s+\S/.test(l)) {
        blocos.push({ tipo: "titulo_num", texto: l });
        continue;
      }

      const semEspacos = l.replace(/\s/g, "");
      if (
        semEspacos.length >= 10 &&
        l.length <= 80 &&
        l === l.toUpperCase() &&
        /[A-ZÁÉÍÓÚÂÊÔÃÕÜÇ]/.test(l)
      ) {
        blocos.push({ tipo: "titulo_caps", texto: l });
        continue;
      }

      blocos.push({ tipo: "paragrafo", texto: l });
    }
  }

  return blocos;
}

// ── Renderização de blocos em elementos docx ─────────────────────
function paragrafosDocx(texto: string): (Paragraph | Table)[] {
  const blocos = parsear(texto);
  const resultado: (Paragraph | Table)[] = [];

  for (const bloco of blocos) {
    switch (bloco.tipo) {
      case "titulo_num":
        resultado.push(
          new Paragraph({
            children: [
              new TextRun({ text: bloco.texto, size: 20, color: TEXTO, font: "Arial Nova Light" }),
            ],
            border: {
              bottom: { color: LINHA, style: BorderStyle.SINGLE, size: 4 },
            },
            spacing: { before: 280, after: 120 },
          }),
        );
        break;

      case "titulo_caps":
        resultado.push(
          new Paragraph({
            children: [
              new TextRun({ text: bloco.texto, size: 20, color: CINZA, font: "Arial Nova Light" }),
            ],
            border: {
              bottom: { color: LINHA, style: BorderStyle.SINGLE, size: 4 },
            },
            spacing: { before: 280, after: 120 },
          }),
        );
        break;

      case "bullet":
        resultado.push(
          new Paragraph({
            children: [
              new TextRun({ text: `• ${bloco.texto}`, size: 20, color: TEXTO, font: "Arial Nova Light" }),
            ],
            spacing: { after: 80 },
            indent: { left: convertInchesToTwip(0.3) },
          }),
        );
        break;

      case "paragrafo":
        resultado.push(
          new Paragraph({
            children: [
              new TextRun({ text: bloco.texto, size: 20, color: TEXTO, font: "Arial Nova Light" }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 140 },
          }),
        );
        break;

      case "tabela": {
        const nCols = bloco.cabecalho.length;
        if (nCols === 0) break;
        const pct = Math.floor(100 / nCols);
        resultado.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDAS_NENHUMA,
            rows: [
              // Cabeçalho azul
              new TableRow({
                tableHeader: true,
                children: bloco.cabecalho.map((h) =>
                  new TableCell({
                    width: { size: pct, type: WidthType.PERCENTAGE },
                    shading: { fill: AZUL, type: ShadingType.CLEAR },
                    borders: BORDAS_NENHUMA,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        spacing: { before: 0, after: 0 },
                        children: [
                          new TextRun({ text: h.replace(/\*\*/g, ""), bold: true, size: 16, color: "FFFFFF", font: "Arial Nova Light" }),
                        ],
                      }),
                    ],
                  }),
                ),
              }),
              // Linhas de dados
              ...bloco.linhas.map((row, ri) =>
                new TableRow({
                  children: row.map((cell) => {
                    const isBold = cell.startsWith("**") && cell.endsWith("**");
                    const txt = isBold ? cell.slice(2, -2) : cell;
                    return new TableCell({
                      width: { size: pct, type: WidthType.PERCENTAGE },
                      shading: { fill: ri % 2 === 0 ? "F5F5FA" : "FFFFFF", type: ShadingType.CLEAR },
                      borders: {
                        top: BORDA_NENHUMA,
                        left: BORDA_NENHUMA,
                        right: BORDA_NENHUMA,
                        bottom: { style: BorderStyle.SINGLE, size: 2, color: LINHA },
                      },
                      margins: { top: 60, bottom: 60, left: 100, right: 100 },
                      children: [
                        new Paragraph({
                          spacing: { before: 0, after: 0 },
                          children: [
                            new TextRun({ text: txt, bold: isBold, size: 18, color: TEXTO, font: "Arial Nova Light" }),
                          ],
                        }),
                      ],
                    });
                  }),
                }),
              ),
            ],
          }),
        );
        resultado.push(new Paragraph({ spacing: { before: 0, after: 140 }, children: [] }));
        break;
      }
    }
  }

  return resultado;
}

// ── Quebra de página ─────────────────────────────────────────────
function quebrarPagina(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── Barra de título de seção (full-bleed, borda a borda) ─────────
function barraTituloSecao(titulo: string): (Paragraph | Table)[] {
  return [
    new Table({
      width: { size: PAGE_W_TWIPS, type: WidthType.DXA },
      indent: { size: -MARGEM_TWIPS, type: WidthType.DXA },
      borders: BORDAS_NENHUMA,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_W_TWIPS, type: WidthType.DXA },
              shading: { fill: AZUL, type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: MARGEM_TWIPS, right: 200 },
              borders: BORDAS_NENHUMA,
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({
                      text: titulo.toUpperCase(),
                      bold: true,
                      size: 20,
                      color: "FFFFFF",
                      font: "Arial Nova Light",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ];
}

// ── Cabeçalho da capa: full-bleed, logo branco + info azul ──────
function cabecalhoCapa(logoSvg: Buffer): Table {
  return new Table({
    width: { size: PAGE_W_TWIPS, type: WidthType.DXA },
    indent: { size: -MARGEM_TWIPS, type: WidthType.DXA },
    borders: BORDAS_NENHUMA,
    rows: [
      new TableRow({
        children: [
          // Coluna do logo — fundo azul, logo SVG branco
          new TableCell({
            width: { size: LOGO_COL_TWIPS, type: WidthType.DXA },
            shading: { fill: AZUL, type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 200, right: 200 },
            borders: BORDAS_NENHUMA,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [
                  new ImageRun({
                    type: "svg",
                    data: logoSvg,
                    fallback: { type: "png", data: FALLBACK_PNG },
                    transformation: { width: 50, height: 49 },
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({ text: "AVN", bold: true, font: "Arial Nova Light", size: 18, color: "FFFFFF" }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({ text: "TECNOLOGIA", font: "Arial Nova Light", size: 11, color: "FFFFFF" }),
                ],
              }),
            ],
          }),
          // Coluna de info — fundo azul
          new TableCell({
            width: { size: PAGE_W_TWIPS - LOGO_COL_TWIPS, type: WidthType.DXA },
            shading: { fill: AZUL, type: ShadingType.CLEAR },
            margins: { top: 180, bottom: 180, left: 220, right: 200 },
            borders: BORDAS_NENHUMA,
            children: [
              new Paragraph({
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({ text: "Atitude Valores e Negócios", bold: true, size: 28, color: "FFFFFF", font: "Arial Nova Light" }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: "Pessoas com atitude, nossa entrega de maior valor", size: 18, color: "E0E4FF", font: "Arial Nova Light" }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Mapeamento de seções ─────────────────────────────────────────
const TITULOS: Record<keyof ConteudoSecoes, string> = {
  folha_rosto: "Folha de Rosto",
  termo_confidencialidade: "Termo de Confidencialidade",
  apresentacao: "Apresentação",
  objetivo_escopo: "Objetivo / Escopo",
  proposta: "Proposta",
  escopo: "Escopo",
  documentacao: "Documentação",
  perfis: "Perfis",
  planejamento: "Planejamento",
  equipe_projeto: "Equipe do Projeto",
  governanca_comunicacao: "Governança e Comunicação",
  modelo_execucao: "Modelo de Execução",
  suporte: "Suporte",
  documentacao_tecnica: "Documentação Técnica, Funcional",
  fora_escopo: "Fora do Escopo",
  geral: "Geral",
  cronograma: "Cronograma",
  gestao_governanca: "Gestão e Governança",
  modalidade_atuacao: "Modalidade de Atuação",
  premissas_dependencias: "Premissas, Dependências e Condições de Execução",
  investimento: "Investimento",
  consideracoes_finais: "Considerações Finais",
  texto_aceite: "Aceite",
  notas_geracao: "",   // nunca exportado — usado apenas pelo chat
};

const ORDEM: (keyof ConteudoSecoes)[] = [
  "folha_rosto",
  "termo_confidencialidade",
  "apresentacao",
  "objetivo_escopo",
  "proposta",
  "escopo",
  "documentacao",
  "perfis",
  "planejamento",
  "equipe_projeto",
  "governanca_comunicacao",
  "modelo_execucao",
  "suporte",
  "documentacao_tecnica",
  "fora_escopo",
  "geral",
  "cronograma",
  "gestao_governanca",
  "modalidade_atuacao",
  "premissas_dependencias",
  "investimento",
  "consideracoes_finais",
  "texto_aceite",
];

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

// ── Gerador principal ────────────────────────────────────────────
export async function gerarDocx(proposta: Proposta, tituloCliente: string): Promise<Buffer> {
  const logoSvg = fs.readFileSync(path.join(process.cwd(), "Ativos", "symbol-avn-white.svg"));

  const secoes = proposta.conteudo_secoes as ConteudoSecoes | null | undefined;
  const children: (Paragraph | Table)[] = [];

  // Data formatada em português
  const agora = new Date();
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const dataFormatada = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}.`;

  if (secoes) {
    let primeiro = true;

    for (const chave of ORDEM) {
      const conteudo = secoes[chave];
      if (!conteudo || typeof conteudo !== "string" || !conteudo.trim()) continue;

      if (chave === "folha_rosto") {
        // Capa: título + data + corpo (cabeçalho vai em headers.first)

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: proposta.titulo ?? tituloCliente,
                size: 36,
                color: TEXTO,
                font: "Arial Nova Light",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 160 },
          }),
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: dataFormatada,
                size: 20,
                color: TEXTO,
                font: "Arial Nova Light",
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: 400 },
          }),
        );

        children.push(...paragrafosDocx(conteudo));
        primeiro = false;
        continue;
      }

      // Demais seções: quebra de página + barra de título + conteúdo
      if (!primeiro) children.push(quebrarPagina());
      primeiro = false;

      children.push(...barraTituloSecao(TITULOS[chave]));
      children.push(...paragrafosDocx(conteudo));
    }
  } else {
    // ── Fallback ─────────────────────────────────────────────────
    // cabeçalho vai em headers.first

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: proposta.titulo ?? tituloCliente,
            size: 36,
            color: TEXTO,
            font: "Arial Nova Light",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 160 },
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: dataFormatada, size: 20, color: TEXTO, font: "Arial Nova Light" }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 400 },
      }),
    );

    if (proposta.resumo_solucao) {
      children.push(quebrarPagina());
      children.push(...barraTituloSecao("Resumo da Solução"));
      children.push(...paragrafosDocx(proposta.resumo_solucao));
    }

    const escopo = asStringArray(proposta.escopo);
    if (escopo.length > 0) {
      children.push(quebrarPagina());
      children.push(...barraTituloSecao("Escopo"));
      for (const item of escopo) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item}`, size: 20, color: TEXTO, font: "Arial Nova Light" })],
            spacing: { after: 80 },
            indent: { left: convertInchesToTwip(0.3) },
          }),
        );
      }
    }

    children.push(quebrarPagina());
    children.push(...barraTituloSecao("Investimento"));

    const kv: Array<{ label: string; value: string }> = [
      { label: "Valor total", value: proposta.valor_total != null ? formatarBRL(Number(proposta.valor_total)) : "—" },
      { label: "Moeda", value: proposta.moeda ?? "BRL" },
      { label: "Prazo de entrega", value: proposta.prazo_entrega_dias ? `${proposta.prazo_entrega_dias} dias` : "—" },
      { label: "Validade", value: proposta.validade_dias ? `${proposta.validade_dias} dias` : "—" },
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDAS_NENHUMA,
        rows: kv.map(({ label, value }) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: BORDAS_NENHUMA,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: label, bold: true, size: 20, color: CINZA, font: "Arial Nova Light" }),
                    ],
                    spacing: { after: 80 },
                  }),
                ],
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: BORDAS_NENHUMA,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: value, size: 20, color: TEXTO, font: "Arial Nova Light" }),
                    ],
                    spacing: { after: 80 },
                  }),
                ],
              }),
            ],
          }),
        ),
      }),
    );

    if (proposta.condicoes_pagamento) {
      children.push(quebrarPagina());
      children.push(...barraTituloSecao("Condições de Pagamento"));
      children.push(...paragrafosDocx(proposta.condicoes_pagamento));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial Nova Light", size: 20, color: TEXTO },
          paragraph: { spacing: { after: 140 } },
        },
      },
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            margin: {
              top: MARGEM_TWIPS,
              bottom: MARGEM_TWIPS,
              left: MARGEM_TWIPS,
              right: MARGEM_TWIPS,
              header: 0,
              footer: 440,
            },
          },
        },
        headers: {
          first: new Header({ children: [cabecalhoCapa(logoSvg)] }),
          default: new Header({ children: [] }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: {
                  top: { style: BorderStyle.SINGLE, color: LINHA, size: 6, space: 4 },
                },
                spacing: { before: 60 },
                children: [
                  new TextRun({
                    text: "Av Dr Chucri Zaidan 1550 Cj 1808 Sala 9146 Vila São Francisco – São Paulo - SP - cep 04711-130   www.avntecnologia.com.br",
                    font: "Arial Nova Light",
                    size: 14,
                    color: CINZA,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
