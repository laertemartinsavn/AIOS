import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import type { Proposta } from "@/lib/types/entities";
import type { ConteudoSecoes } from "@/lib/ia/gerar-proposta";
import { formatarBRL } from "@/lib/ui/cores";

// ── Paleta de cores ─────────────────────────────────────────────
const C_AZUL = rgb(0.239, 0.263, 0.573);       // #3D4392 — cor oficial AVN
const C_TEXTO = rgb(0.533, 0.533, 0.533);        // #888888 — corpo (Arial Nova Light 10)
const C_CINZA = rgb(0.533, 0.533, 0.533);       // #888888 — sub-headings / rodapé
const C_LINHA = rgb(0.867, 0.867, 0.875);       // #DDDDE0 — separadores
const C_BRANCO = rgb(1, 1, 1);
const C_BRANCO_SUAVE = rgb(0.9, 0.9, 0.95);    // tagline

// ── Constantes de layout ────────────────────────────────────────
const MARGEM = 42.5;       // 1.5 cm ≈ 42.5 pt
const HEADER_H = 90;       // altura do cabeçalho da capa em pt
const LOGO_CX = 38;        // centro x do logo no cabeçalho
const [LARGURA, ALTURA] = PageSizes.A4;         // ≈ 595.28 × 841.89
const UTIL = LARGURA - MARGEM * 2;

// ── Tipos ───────────────────────────────────────────────────────
type FonteRef = Awaited<ReturnType<PDFDocument["embedFont"]>>;
type Fontes = { bold: FonteRef; reg: FonteRef };
type Estado = {
  doc: PDFDocument;
  fontes: Fontes;
  pagina: ReturnType<PDFDocument["addPage"]>;
  y: number;
};

type Bloco =
  | { tipo: "paragrafo" | "bullet" | "titulo_num" | "titulo_caps"; texto: string }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] };

function parseCells(linha: string): string[] {
  return linha.split("|").slice(1, -1).map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^[-: ]+$/.test(c));
}

// ── Parser de texto ─────────────────────────────────────────────
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

// ── Quebra de linha ─────────────────────────────────────────────
function quebrarTexto(
  texto: string,
  fonte: FonteRef,
  tamanho: number,
  maxLarg: number,
): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    if (!paragrafo.trim()) {
      linhas.push("");
      continue;
    }
    const palavras = paragrafo.split(" ");
    let linha = "";
    for (const p of palavras) {
      const tentativa = linha ? `${linha} ${p}` : p;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) > maxLarg) {
        if (linha) linhas.push(linha);
        linha = p;
      } else {
        linha = tentativa;
      }
    }
    if (linha) linhas.push(linha);
  }
  return linhas;
}

// ── Logo AVN (symbol-avn-white.svg) ─────────────────────────────
// viewBox: 11200 3800 6700 6600  →  centro SVG: (14550, 7100)
const AVN_LOGO_PATHS = [
  "M13462 8610c17,246 -70,1307 4,1442 38,70 137,109 222,84 170,-50 166,-282 201,-442 71,-329 150,-675 210,-1001 31,-168 72,-331 103,-504 63,-342 246,-871 -418,-494l-1413 811c-135,77 -380,179 -417,306 -29,100 16,333 355,210 377,-136 777,-294 1153,-412z",
  "M12497 9654c183,416 828,141 642,-294 -167,-390 -840,-156 -642,294z",
  "M15494 8618c106,15 775,265 938,321 113,39 364,168 500,84 73,-46 106,-147 65,-246 -29,-68 -127,-116 -184,-150 -135,-81 -289,-156 -420,-237l-417 -239c-146,-77 -272,-155 -417,-241 -131,-78 -278,-150 -408,-230 -101,-63 -346,-227 -457,-25 -68,124 43,452 79,621 93,441 182,872 277,1313 39,183 51,504 226,548 108,27 197,-39 232,-108 33,-66 20,-175 17,-266 -12,-376 -34,-781 -31,-1145z",
  "M15827 9659c191,410 833,125 638,-310 -184,-410 -845,-132 -638,310z",
  "M14465 5487l-618 -902c-93,-133 -226,-395 -425,-224 -151,129 -2,343 80,525l749 1662c154,343 371,174 419,62 144,-337 919,-1995 921,-2094 2,-159 -206,-348 -393,-78l-289 417c-110,149 -343,539 -444,632z",
  "M14285 4085c-400,277 -22,838 374,597 136,-82 227,-279 118,-476 -79,-141 -295,-257 -492,-121z",
  "M16132 6669l618 -821c78,-100 293,-292 184,-457 -49,-76 -153,-113 -257,-67 -68,29 -1196,1070 -1397,1256 -91,84 -342,270 -366,383 -52,254 231,256 398,269 480,37 1226,129 1713,184 153,17 448,95 504,-107 69,-249 -225,-278 -370,-326 -186,-62 -955,-253 -1027,-314z",
  "M16994 6031c-409,241 -54,826 341,618 418,-222 68,-859 -341,-618z",
  "M12825 6690c-378,134 -822,244 -1210,358 -233,69 -269,307 -82,396 87,41 465,-25 595,-41 184,-21 1724,-161 1817,-222 221,-144 18,-337 -84,-428 -487,-435 -956,-869 -1440,-1299 -62,-55 -119,-118 -191,-137 -104,-28 -194,28 -228,100 -77,161 123,352 211,463 88,109 586,739 612,810z",
  "M11606 6042c-401,234 -65,829 337,615 421,-223 70,-853 -337,-615z",
];

function desenharLogoAVN(
  pagina: ReturnType<PDFDocument["addPage"]>,
  cx: number,
  cy: number,
  tamanho: number,
  cor: ReturnType<typeof rgb>,
): void {
  const scale = tamanho / 6700;
  // pdf-lib flips Y: ponto SVG (sx, sy) → PDF (sx*scale + xOff, -sy*scale + yOff)
  // Para centro SVG (14550, 7100) cair em (cx, cy):
  const xOff = cx - 14550 * scale;
  const yOff = cy + 7100 * scale;
  for (const path of AVN_LOGO_PATHS) {
    pagina.drawSvgPath(path, { x: xOff, y: yOff, scale, color: cor });
  }
}

// ── Rodapé ──────────────────────────────────────────────────────
function desenharRodape(e: Estado): void {
  e.pagina.drawLine({
    start: { x: MARGEM, y: 38 },
    end: { x: LARGURA - MARGEM, y: 38 },
    thickness: 0.5,
    color: C_LINHA,
  });
  e.pagina.drawText(
    "Av Dr Chucri Zaidan 1550 Cj 1808 Sala 9146 Vila São Francisco – São Paulo - SP - cep 04711-130   www.avntecnologia.com.br",
    { x: MARGEM, y: 24, size: 7, font: e.fontes.reg, color: C_CINZA },
  );
}

// ── Barra de título de seção (topo da página) ───────────────────
function desenharBarraTitulo(e: Estado, titulo: string): void {
  // Retângulo azul full-width, 36pt de altura no topo da página
  e.pagina.drawRectangle({
    x: 0,
    y: ALTURA - 36,
    width: LARGURA,
    height: 36,
    color: C_AZUL,
  });
  e.pagina.drawText(titulo.toUpperCase(), {
    x: MARGEM,
    y: ALTURA - 23,
    size: 9.5,
    font: e.fontes.bold,
    color: C_BRANCO,
  });
  // Conteúdo começa abaixo da barra + gap de 16pt
  e.y = ALTURA - 36 - 16;
}

// ── Nova página de seção (começa com barra de título) ───────────
function novaPaginaSecao(e: Estado, titulo: string): void {
  e.pagina = e.doc.addPage(PageSizes.A4);
  e.y = ALTURA;
  desenharRodape(e);
  desenharBarraTitulo(e, titulo);
}

// ── Nova página de continuação (sem barra de título) ────────────
function novaPaginaContinuacao(e: Estado): void {
  e.pagina = e.doc.addPage(PageSizes.A4);
  e.y = ALTURA - MARGEM;
  desenharRodape(e);
}

// ── Verificação de espaço ────────────────────────────────────────
function checarEspaco(e: Estado, necessario: number): void {
  if (e.y - necessario < 55) novaPaginaContinuacao(e);
}

// ── Folha de rosto ───────────────────────────────────────────────
function desenharFolhaRosto(
  e: Estado,
  proposta: Proposta,
  tituloCliente: string,
  conteudo: string,
): void {
  // ── Cabeçalho: retângulo azul full-bleed (sem margens) ──────────
  e.pagina.drawRectangle({
    x: 0,
    y: ALTURA - HEADER_H,
    width: LARGURA,
    height: HEADER_H,
    color: C_AZUL,
  });

  // Logo (snowflake) em branco diretamente sobre o azul
  const snowCY = ALTURA - HEADER_H / 2 - 8;
  desenharLogoAVN(e.pagina, LOGO_CX, snowCY, 36, C_BRANCO);

  // "AVN" centralizado sob o logo
  const avnLarg = e.fontes.bold.widthOfTextAtSize("AVN", 8.5);
  e.pagina.drawText("AVN", {
    x: LOGO_CX - avnLarg / 2,
    y: ALTURA - HEADER_H + 20,
    size: 8.5,
    font: e.fontes.bold,
    color: C_BRANCO,
  });

  // "TECNOLOGIA" centralizado abaixo de AVN
  const tecLarg = e.fontes.reg.widthOfTextAtSize("TECNOLOGIA", 5.5);
  e.pagina.drawText("TECNOLOGIA", {
    x: LOGO_CX - tecLarg / 2,
    y: ALTURA - HEADER_H + 11,
    size: 5.5,
    font: e.fontes.reg,
    color: C_BRANCO,
  });

  // "Atitude Valores e Negócios" — à direita do logo, verticalmente centrado
  e.pagina.drawText("Atitude Valores e Negócios", {
    x: LOGO_CX * 2 + 14,
    y: ALTURA - HEADER_H / 2 + 4,
    size: 14,
    font: e.fontes.bold,
    color: C_BRANCO,
  });

  // Tagline
  e.pagina.drawText("Pessoas com atitude, nossa entrega de maior valor", {
    x: LOGO_CX * 2 + 14,
    y: ALTURA - HEADER_H / 2 - 12,
    size: 9,
    font: e.fontes.reg,
    color: C_BRANCO_SUAVE,
  });

  // Corpo começa após o cabeçalho com margem
  e.y = ALTURA - HEADER_H - MARGEM;

  // Título da proposta — centralizado, 18pt, cor texto
  const tituloProp = proposta.titulo ?? tituloCliente;
  const linhasTitulo = quebrarTexto(tituloProp, e.fontes.reg, 18, UTIL);
  for (const linha of linhasTitulo) {
    checarEspaco(e, 24);
    const largLinha = e.fontes.reg.widthOfTextAtSize(linha, 18);
    const xCentro = MARGEM + (UTIL - largLinha) / 2;
    e.pagina.drawText(linha, {
      x: xCentro,
      y: e.y,
      size: 18,
      font: e.fontes.reg,
      color: C_TEXTO,
    });
    e.y -= 24;
  }

  e.y -= 10;

  // Data — alinhada à direita, 10pt itálico (sem itálico no pdf-lib stdlib, usamos reg)
  const agora = new Date();
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const dataFormatada = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}.`;
  const largData = e.fontes.reg.widthOfTextAtSize(dataFormatada, 10);
  e.pagina.drawText(dataFormatada, {
    x: LARGURA - MARGEM - largData,
    y: e.y,
    size: 10,
    font: e.fontes.reg,
    color: C_TEXTO,
  });
  e.y -= 20;

  // Corpo da folha de rosto
  desenharCorpo(e, conteudo);
}

// ── Corpo: renderiza blocos parseados ───────────────────────────
function desenharCorpo(e: Estado, texto: string): void {
  const blocos = parsear(texto);

  for (const bloco of blocos) {
    switch (bloco.tipo) {
      case "titulo_num": {
        checarEspaco(e, 30);
        e.pagina.drawText(bloco.texto, {
          x: MARGEM,
          y: e.y,
          size: 10,
          font: e.fontes.reg,
          color: C_TEXTO,
        });
        // Linha separadora 1pt abaixo do texto
        e.pagina.drawLine({
          start: { x: MARGEM, y: e.y - 13 },
          end: { x: LARGURA - MARGEM, y: e.y - 13 },
          thickness: 0.5,
          color: C_LINHA,
        });
        e.y -= 22;
        break;
      }

      case "titulo_caps": {
        checarEspaco(e, 28);
        e.pagina.drawText(bloco.texto, {
          x: MARGEM,
          y: e.y,
          size: 9.5,
          font: e.fontes.reg,
          color: C_CINZA,
        });
        e.pagina.drawLine({
          start: { x: MARGEM, y: e.y - 13 },
          end: { x: LARGURA - MARGEM, y: e.y - 13 },
          thickness: 0.5,
          color: C_LINHA,
        });
        e.y -= 20;
        break;
      }

      case "bullet": {
        checarEspaco(e, 16);
        e.pagina.drawText("•", {
          x: MARGEM + 8,
          y: e.y,
          size: 10,
          font: e.fontes.reg,
          color: C_TEXTO,
        });
        const linhas = quebrarTexto(bloco.texto, e.fontes.reg, 10, UTIL - 22);
        for (const linha of linhas) {
          checarEspaco(e, 14);
          if (linha) {
            e.pagina.drawText(linha, {
              x: MARGEM + 22,
              y: e.y,
              size: 10,
              font: e.fontes.reg,
              color: C_TEXTO,
            });
          }
          e.y -= 14;
        }
        break;
      }

      case "paragrafo": {
        const linhas = quebrarTexto(bloco.texto, e.fontes.reg, 10, UTIL);
        for (const linha of linhas) {
          checarEspaco(e, 14);
          if (linha) {
            e.pagina.drawText(linha, {
              x: MARGEM,
              y: e.y,
              size: 10,
              font: e.fontes.reg,
              color: C_TEXTO,
            });
          }
          e.y -= 14;
        }
        e.y -= 5;
        break;
      }

      case "tabela": {
        const nCols = bloco.cabecalho.length;
        if (nCols === 0) break;
        const colW = UTIL / nCols;
        const HEADER_ROW_H = 22;
        const DATA_ROW_H = 20;
        const C_FUNDO_PAR = rgb(0.965, 0.965, 0.98);

        checarEspaco(e, HEADER_ROW_H + DATA_ROW_H * Math.min(bloco.linhas.length, 3));

        // Cabeçalho azul
        e.pagina.drawRectangle({
          x: MARGEM, y: e.y - HEADER_ROW_H,
          width: UTIL, height: HEADER_ROW_H,
          color: C_AZUL,
        });
        for (let ci = 0; ci < nCols; ci++) {
          const txt = bloco.cabecalho[ci].replace(/\*\*/g, "");
          const truncado = quebrarTexto(txt, e.fontes.bold, 8, colW - 8)[0] ?? txt;
          e.pagina.drawText(truncado, {
            x: MARGEM + ci * colW + 5,
            y: e.y - 14,
            size: 8,
            font: e.fontes.bold,
            color: C_BRANCO,
          });
        }
        e.y -= HEADER_ROW_H;

        // Linhas de dados
        for (let ri = 0; ri < bloco.linhas.length; ri++) {
          const row = bloco.linhas[ri];
          checarEspaco(e, DATA_ROW_H);
          if (ri % 2 === 0) {
            e.pagina.drawRectangle({
              x: MARGEM, y: e.y - DATA_ROW_H,
              width: UTIL, height: DATA_ROW_H,
              color: C_FUNDO_PAR,
            });
          }
          for (let ci = 0; ci < nCols; ci++) {
            const cell = row[ci] ?? "";
            const isBold = cell.startsWith("**") && cell.endsWith("**");
            const cellTxt = isBold ? cell.slice(2, -2) : cell;
            const fonte = isBold ? e.fontes.bold : e.fontes.reg;
            const truncado = quebrarTexto(cellTxt, fonte, 9, colW - 8)[0] ?? cellTxt;
            if (truncado) {
              e.pagina.drawText(truncado, {
                x: MARGEM + ci * colW + 5,
                y: e.y - 13,
                size: 9,
                font: fonte,
                color: C_TEXTO,
              });
            }
          }
          e.pagina.drawLine({
            start: { x: MARGEM, y: e.y - DATA_ROW_H },
            end: { x: MARGEM + UTIL, y: e.y - DATA_ROW_H },
            thickness: 0.3,
            color: C_LINHA,
          });
          e.y -= DATA_ROW_H;
        }
        e.y -= 8;
        break;
      }
    }
  }
}

// ── Mapeamento de seções ────────────────────────────────────────
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

// ── Gerador principal ───────────────────────────────────────────
export async function gerarPdf(proposta: Proposta, tituloCliente: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);

  const e: Estado = {
    doc,
    fontes: { bold, reg },
    pagina: doc.addPage(PageSizes.A4),
    y: ALTURA,
  };
  desenharRodape(e);

  const secoes = proposta.conteudo_secoes as ConteudoSecoes | null | undefined;

  if (secoes) {
    let primeiro = true;
    for (const chave of ORDEM) {
      const conteudo = secoes[chave];
      if (!conteudo || typeof conteudo !== "string" || !conteudo.trim()) continue;

      if (chave === "folha_rosto") {
        // Primeira página: já criada, só desenhamos o conteúdo
        desenharFolhaRosto(e, proposta, tituloCliente, conteudo);
        primeiro = false;
      } else {
        // Cada outra seção começa numa nova página com barra de título
        novaPaginaSecao(e, TITULOS[chave]);
        primeiro = false;
        desenharCorpo(e, conteudo);
      }
    }

    // Se não havia folha_rosto, ao menos inicia o documento
    if (primeiro) {
      e.y = ALTURA - MARGEM;
    }
  } else {
    // ── Fallback ────────────────────────────────────────────────
    e.pagina.drawRectangle({ x: 0, y: ALTURA - HEADER_H, width: LARGURA, height: HEADER_H, color: C_AZUL });
    desenharLogoAVN(e.pagina, LOGO_CX, ALTURA - HEADER_H / 2 - 8, 36, C_BRANCO);
    const avnW = e.fontes.bold.widthOfTextAtSize("AVN", 8.5);
    e.pagina.drawText("AVN", { x: LOGO_CX - avnW / 2, y: ALTURA - HEADER_H + 20, size: 8.5, font: e.fontes.bold, color: C_BRANCO });
    const tecW = e.fontes.reg.widthOfTextAtSize("TECNOLOGIA", 5.5);
    e.pagina.drawText("TECNOLOGIA", { x: LOGO_CX - tecW / 2, y: ALTURA - HEADER_H + 11, size: 5.5, font: e.fontes.reg, color: C_BRANCO });
    e.pagina.drawText("Atitude Valores e Negócios", { x: LOGO_CX * 2 + 14, y: ALTURA - HEADER_H / 2 + 4, size: 14, font: e.fontes.bold, color: C_BRANCO });
    e.pagina.drawText("Pessoas com atitude, nossa entrega de maior valor", { x: LOGO_CX * 2 + 14, y: ALTURA - HEADER_H / 2 - 12, size: 9, font: e.fontes.reg, color: C_BRANCO_SUAVE });
    e.y = ALTURA - HEADER_H - MARGEM;

    const tituloProp = proposta.titulo ?? tituloCliente;
    const linhasTitulo = quebrarTexto(tituloProp, e.fontes.reg, 18, UTIL);
    for (const linha of linhasTitulo) {
      const largLinha = e.fontes.reg.widthOfTextAtSize(linha, 18);
      const xCentro = MARGEM + (UTIL - largLinha) / 2;
      e.pagina.drawText(linha, {
        x: xCentro,
        y: e.y,
        size: 18,
        font: e.fontes.reg,
        color: C_TEXTO,
      });
      e.y -= 24;
    }
    e.y -= 16;

    if (proposta.resumo_solucao) {
      novaPaginaSecao(e, "Resumo da Solução");
      desenharCorpo(e, proposta.resumo_solucao);
    }

    const escopo = asStringArray(proposta.escopo);
    if (escopo.length > 0) {
      novaPaginaSecao(e, "Escopo");
      for (const item of escopo) {
        checarEspaco(e, 16);
        desenharCorpo(e, `• ${item}`);
      }
    }

    novaPaginaSecao(e, "Investimento");
    const kv: Array<[string, string]> = [
      ["Valor total", proposta.valor_total != null ? formatarBRL(Number(proposta.valor_total)) : "—"],
      ["Moeda", proposta.moeda ?? "BRL"],
      ["Prazo de entrega", proposta.prazo_entrega_dias ? `${proposta.prazo_entrega_dias} dias` : "—"],
      ["Validade", proposta.validade_dias ? `${proposta.validade_dias} dias` : "—"],
    ];
    for (const [label, value] of kv) {
      checarEspaco(e, 18);
      e.pagina.drawText(`${label}: `, {
        x: MARGEM,
        y: e.y,
        size: 10,
        font: e.fontes.bold,
        color: C_CINZA,
      });
      const xValue = MARGEM + e.fontes.bold.widthOfTextAtSize(`${label}: `, 10);
      e.pagina.drawText(value, {
        x: xValue,
        y: e.y,
        size: 10,
        font: e.fontes.reg,
        color: C_TEXTO,
      });
      e.y -= 18;
    }

    if (proposta.condicoes_pagamento) {
      novaPaginaSecao(e, "Condições de Pagamento");
      desenharCorpo(e, proposta.condicoes_pagamento);
    }
  }

  return Buffer.from(await doc.save());
}
