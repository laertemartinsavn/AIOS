import type { Proposta } from "@/lib/types/entities";
import type { ConteudoSecoes } from "@/lib/ia/gerar-proposta";
import { formatarBRL } from "@/lib/ui/cores";

// ─── Design constants ─────────────────────────────────────────────────────────
const AZUL = "#3D4392";  // cor oficial AVN (Pantone 19-3955 TCX)
const TEXTO = "#333333";
const CINZA_SUB = "#888888";
const LINHA = "#DDDDE0";
const RODAPE_TXT =
  "Av Dr Chucri Zaidan 1550 Cj 1808 Sala 9146 Vila São Francisco – São Paulo – SP – cep 04711-130   www.avntecnologia.com.br";

// ─── Section ordering & titles ────────────────────────────────────────────────
const ORDEM: (keyof ConteudoSecoes)[] = [
  // Universal
  "folha_rosto",
  "termo_confidencialidade",
  "apresentacao",
  // Body Shop + Proj. Não SAP
  "objetivo_escopo",
  // Proj. Não SAP
  "proposta",
  // Squad + Proj. SAP
  "escopo",
  // Squad apenas
  "documentacao",
  "perfis",
  // Proj. SAP
  "planejamento",
  "equipe_projeto",
  "governanca_comunicacao",
  "modelo_execucao",
  "suporte",
  "documentacao_tecnica",
  "fora_escopo",
  "geral",
  "cronograma",
  // Body Shop + Squad
  "gestao_governanca",
  "modalidade_atuacao",
  // Proj. Não SAP
  "premissas_dependencias",
  // Universal
  "investimento",
  "consideracoes_finais",
  "texto_aceite",
];

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
  notas_geracao: "",   // nunca renderizado — usado apenas pelo chat
};

// ─── Text parser ──────────────────────────────────────────────────────────────
type Bloco =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "bullet"; texto: string }
  | { tipo: "titulo_num"; texto: string }
  | { tipo: "titulo_caps"; texto: string }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] };

function isAllCaps(s: string): boolean {
  const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letras.length >= 6 && letras === letras.toUpperCase();
}

function parseCells(linha: string): string[] {
  return linha.split("|").slice(1, -1).map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^[-: ]+$/.test(c));
}

function parsear(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  for (const par of texto.split(/\n\n+/)) {
    const linhas = par.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) continue;

    // Markdown table: first line starts with |
    if (linhas[0].startsWith("|")) {
      const rows = linhas.map(parseCells);
      const cabecalho = rows[0] ?? [];
      const dataLinhas = rows.slice(1).filter((r) => !isSeparatorRow(r));
      blocos.push({ tipo: "tabela", cabecalho, linhas: dataLinhas });
      continue;
    }

    for (const linha of linhas) {
      const l = linha;
      if (!l) continue;
      if (/^[•\-\*]\s+/.test(l)) {
        blocos.push({ tipo: "bullet", texto: l.replace(/^[•\-\*]\s+/, "") });
      } else if (/^\d+\.\s+\S/.test(l)) {
        blocos.push({ tipo: "titulo_num", texto: l });
      } else if (isAllCaps(l) && l.length <= 80) {
        blocos.push({ tipo: "titulo_caps", texto: l });
      } else {
        blocos.push({ tipo: "paragrafo", texto: l });
      }
    }
  }
  return blocos;
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function renderCell(cell: string) {
  if (cell.startsWith("**") && cell.endsWith("**")) {
    return <strong>{cell.slice(2, -2)}</strong>;
  }
  return <>{cell}</>;
}

// ─── Render components ────────────────────────────────────────────────────────
function CorpoTexto({ texto }: { texto: string }) {
  const blocos = parsear(texto);
  return (
    <div style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}>
      {blocos.map((b, i) => {
        if (b.tipo === "titulo_num") {
          return (
            <div key={i} className="mt-5 mb-1">
              <p className="text-[12.5px] leading-snug" style={{ color: TEXTO }}>
                {b.texto}
              </p>
              <div className="mt-1.5 h-px" style={{ background: LINHA }} />
            </div>
          );
        }
        if (b.tipo === "titulo_caps") {
          return (
            <div key={i} className="mt-5 mb-1">
              <p className="text-[12px] leading-snug" style={{ color: CINZA_SUB }}>
                {b.texto}
              </p>
              <div className="mt-1.5 h-px" style={{ background: LINHA }} />
            </div>
          );
        }
        if (b.tipo === "bullet") {
          return (
            <div key={i} className="flex gap-2.5 pl-5 py-[3px]">
              <span className="shrink-0 text-[13px] mt-[1px]" style={{ color: TEXTO }}>
                •
              </span>
              <p
                className="text-[12.5px] leading-relaxed"
                style={{ color: TEXTO, textAlign: "justify" }}
              >
                {b.texto}
              </p>
            </div>
          );
        }
        if (b.tipo === "tabela") {
          return (
            <div key={i} className="my-4 overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr style={{ background: AZUL }}>
                    {b.cabecalho.map((h, j) => (
                      <th
                        key={j}
                        className="px-3 py-2 text-left font-bold text-white"
                        style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.linhas.map((row, j) => (
                    <tr key={j} style={{ background: j % 2 === 0 ? "#f5f5fa" : "#ffffff" }}>
                      {row.map((cell, k) => (
                        <td
                          key={k}
                          className="px-3 py-1.5 border-b"
                          style={{ borderColor: LINHA, color: TEXTO }}
                        >
                          {renderCell(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p
            key={i}
            className="text-[12.5px] leading-relaxed mb-2.5"
            style={{ color: TEXTO, textAlign: "justify" }}
          >
            {b.texto}
          </p>
        );
      })}
    </div>
  );
}

function Rodape() {
  return (
    <div className="mx-7 mt-6 border-t pb-5 pt-2" style={{ borderColor: LINHA }}>
      <p className="text-center text-[8.5px]" style={{ color: "#999" }}>
        {RODAPE_TXT}
      </p>
    </div>
  );
}

function PaginaSecao({ titulo, conteudo }: { titulo: string; conteudo: string }) {
  return (
    <div
      className="mb-5 overflow-hidden bg-white"
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.10)" }}
    >
      {/* Title bar */}
      <div className="px-7 py-4" style={{ background: AZUL }}>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.06em] text-white"
          style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
        >
          {titulo}
        </p>
      </div>
      {/* Content */}
      <div className="px-7 pt-5 pb-2">
        <CorpoTexto texto={conteudo} />
      </div>
      <Rodape />
    </div>
  );
}

function PaginaFolhaRosto({ proposta, conteudo }: { proposta: Proposta; conteudo: string }) {
  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="mb-5 overflow-hidden bg-white"
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.10)" }}
    >
      {/* AVN header bar — full bleed, sem margens */}
      <div
        className="flex items-center gap-5 py-4 pl-5 pr-8"
        style={{ background: AZUL }}
      >
        {/* Logo diretamente sobre o azul */}
        <div className="shrink-0 flex flex-col items-center justify-center gap-[3px]">
          <LogoAVNWhite size={40} />
          <p
            className="text-[8px] font-bold leading-none tracking-[.06em] text-white"
            style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
          >
            AVN
          </p>
          <p
            className="text-[5.5px] leading-none tracking-[.22em] text-white"
            style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
          >
            TECNOLOGIA
          </p>
        </div>
        {/* Company name */}
        <div style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}>
          <p className="text-[16px] font-bold leading-tight text-white">
            Atitude Valores e Negócios
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.82)" }}>
            Pessoas com atitude, nossa entrega de maior valor
          </p>
        </div>
      </div>

      {/* Centered title block */}
      <div className="px-14 pb-3 pt-10 text-center">
        <p
          className="text-[19px] leading-relaxed"
          style={{ color: TEXTO, fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
        >
          {proposta.titulo ?? "Proposta Técnica e Comercial"}
        </p>
      </div>

      {/* Date — right aligned */}
      <div className="px-10 pb-7 text-right">
        <p
          className="text-[12px] italic"
          style={{ color: TEXTO, fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
        >
          {hoje}.
        </p>
      </div>

      {/* Letter body */}
      <div className="px-10 pb-4">
        <CorpoTexto texto={conteudo} />
      </div>

      <Rodape />
    </div>
  );
}

function LogoAVNWhite({ size = 46 }: { size?: number }) {
  const h = Math.round(size * 6600 / 6700);
  return (
    <svg
      width={size}
      height={h}
      viewBox="11200 3800 6700 6600"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path fill="#FEFEFE" d="M13462 8610c17,246 -70,1307 4,1442 38,70 137,109 222,84 170,-50 166,-282 201,-442 71,-329 150,-675 210,-1001 31,-168 72,-331 103,-504 63,-342 246,-871 -418,-494l-1413 811c-135,77 -380,179 -417,306 -29,100 16,333 355,210 377,-136 777,-294 1153,-412z" />
      <path fill="#FEFEFE" d="M12497 9654c183,416 828,141 642,-294 -167,-390 -840,-156 -642,294z" />
      <path fill="#FEFEFE" d="M15494 8618c106,15 775,265 938,321 113,39 364,168 500,84 73,-46 106,-147 65,-246 -29,-68 -127,-116 -184,-150 -135,-81 -289,-156 -420,-237l-417 -239c-146,-77 -272,-155 -417,-241 -131,-78 -278,-150 -408,-230 -101,-63 -346,-227 -457,-25 -68,124 43,452 79,621 93,441 182,872 277,1313 39,183 51,504 226,548 108,27 197,-39 232,-108 33,-66 20,-175 17,-266 -12,-376 -34,-781 -31,-1145z" />
      <path fill="#FEFEFE" d="M15827 9659c191,410 833,125 638,-310 -184,-410 -845,-132 -638,310z" />
      <path fill="#FEFEFE" d="M14465 5487l-618 -902c-93,-133 -226,-395 -425,-224 -151,129 -2,343 80,525l749 1662c154,343 371,174 419,62 144,-337 919,-1995 921,-2094 2,-159 -206,-348 -393,-78l-289 417c-110,149 -343,539 -444,632z" />
      <path fill="#FEFEFE" d="M14285 4085c-400,277 -22,838 374,597 136,-82 227,-279 118,-476 -79,-141 -295,-257 -492,-121z" />
      <path fill="#FEFEFE" d="M16132 6669l618 -821c78,-100 293,-292 184,-457 -49,-76 -153,-113 -257,-67 -68,29 -1196,1070 -1397,1256 -91,84 -342,270 -366,383 -52,254 231,256 398,269 480,37 1226,129 1713,184 153,17 448,95 504,-107 69,-249 -225,-278 -370,-326 -186,-62 -955,-253 -1027,-314z" />
      <path fill="#FEFEFE" d="M16994 6031c-409,241 -54,826 341,618 418,-222 68,-859 -341,-618z" />
      <path fill="#FEFEFE" d="M12825 6690c-378,134 -822,244 -1210,358 -233,69 -269,307 -82,396 87,41 465,-25 595,-41 184,-21 1724,-161 1817,-222 221,-144 18,-337 -84,-428 -487,-435 -956,-869 -1440,-1299 -62,-55 -119,-118 -191,-137 -104,-28 -194,28 -228,100 -77,161 123,352 211,463 88,109 586,739 612,810z" />
      <path fill="#FEFEFE" d="M11606 6042c-401,234 -65,829 337,615 421,-223 70,-853 -337,-615z" />
    </svg>
  );
}

// ─── Fallback (proposals without conteudo_secoes) ─────────────────────────────
function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

function FallbackProposta({ proposta }: { proposta: Proposta }) {
  const escopo = asArray(proposta.escopo);
  return (
    <div className="flex flex-col gap-[18px]">
      {proposta.resumo_solucao && (
        <CartaoSecao titulo="Resumo da Solução">
          <p className="text-[13.5px] leading-relaxed text-[#44464A]">{proposta.resumo_solucao}</p>
        </CartaoSecao>
      )}
      {escopo.length > 0 && (
        <CartaoSecao titulo="Escopo">
          <div className="flex flex-col gap-3">
            {escopo.map((item, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-[#EBECF7] bg-[#F4F5FB] p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3D4392] font-brand text-[12px] font-bold text-white">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="text-[13px] leading-relaxed text-[#44464A]">{item}</p>
              </div>
            ))}
          </div>
        </CartaoSecao>
      )}
      <CartaoSecao titulo="Investimento">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InvCard label="Valor total" value={formatarBRL(proposta.valor_total != null ? Number(proposta.valor_total) : null)} highlight />
          <InvCard label="Moeda" value={proposta.moeda ?? "BRL"} />
          <InvCard label="Prazo de entrega" value={proposta.prazo_entrega_dias ? `${proposta.prazo_entrega_dias} dias` : "—"} />
          <InvCard label="Validade" value={proposta.validade_dias ? `${proposta.validade_dias} dias` : "—"} />
        </div>
      </CartaoSecao>
      {proposta.condicoes_pagamento && (
        <CartaoSecao titulo="Condições de Pagamento">
          <p className="text-[13.5px] leading-relaxed text-[#44464A]">{proposta.condicoes_pagamento}</p>
        </CartaoSecao>
      )}
    </div>
  );
}

function CartaoSecao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#D8DAF0] bg-white p-[22px] shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
      <div className="mb-4 font-brand text-[14px] font-semibold text-[#1F2255]">{titulo}</div>
      {children}
    </div>
  );
}

function InvCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-[#3D4392] bg-[#EBECF7]" : "border-[#EBECF7] bg-[#F4F5FB]"}`}>
      <div className="text-[10px] font-brand font-semibold uppercase tracking-[.1em] text-[#797C7F]">{label}</div>
      <div className={`mt-1 font-brand font-bold ${highlight ? "text-[20px] text-[#3D4392]" : "text-[16px] text-[#1F2255]"}`}>{value}</div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function PainelProposta({ proposta }: { proposta: Proposta }) {
  const secoes = proposta.conteudo_secoes as ConteudoSecoes | null | undefined;

  if (!secoes) return <FallbackProposta proposta={proposta} />;

  const presentes = ORDEM.filter((k) => {
    const v = secoes[k];
    return v && typeof v === "string" && v.trim();
  });

  if (presentes.length === 0) return <FallbackProposta proposta={proposta} />;

  return (
    <div>
      {presentes.map((chave) => {
        const conteudo = secoes[chave] as string;
        if (chave === "folha_rosto") {
          return <PaginaFolhaRosto key={chave} proposta={proposta} conteudo={conteudo} />;
        }
        return <PaginaSecao key={chave} titulo={TITULOS[chave]} conteudo={conteudo} />;
      })}
    </div>
  );
}
