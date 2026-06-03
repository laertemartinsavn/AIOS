const XLSX = require('xlsx');
const path = require('path');

function lerLinhas(modalidade = 'PJ') {
  const arquivo = path.join(process.cwd(), 'Ratecard', 'Rate Card - PJ e CLT - Oficial.xlsx');
  const wb = XLSX.readFile(arquivo);
  const nomeAba = modalidade === 'CLT' ? 'Rate Formatado CLT' : 'Rate Formatado PJ';
  const ws = wb.Sheets[nomeAba];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const linhas = [];
  for (const row of data.slice(4)) {
    const perfil = String(row[0] ?? '').trim();
    const horaHO = Number(row[1]);
    const mensalHO = Number(row[2]);
    const horaHib = Number(row[3]);
    const mensalHib = Number(row[4]);
    if (!perfil || !horaHO || horaHO <= 0) continue;
    linhas.push({ perfil, horaHO, mensalHO, horaHib, mensalHib });
  }
  return linhas;
}

function buscarPerfil(nome, linhas) {
  const n = nome.toLowerCase();
  const exato = linhas.find(l => l.perfil.toLowerCase() === n);
  if (exato) return exato;
  const parcial = linhas.find(l => l.perfil.toLowerCase().includes(n));
  if (parcial) return parcial;
  const invertido = linhas.find(l => n.includes(l.perfil.toLowerCase()));
  if (invertido) return invertido;
  // fallback token matching
  const palavras = n.split(/\s+/).filter(Boolean);
  let melhor;
  for (const l of linhas) {
    const pnorm = l.perfil.toLowerCase();
    const matches = palavras.filter(p => pnorm.includes(p)).length;
    const score = matches / Math.max(palavras.length, 1);
    if (score > 0 && (!melhor || score > melhor.score)) melhor = { linha: l, score };
  }
  return melhor?.linha;
}

function recalcular(perfis, modalidade='PJ', regime='HO', options={}){
  const linhas = lerLinhas(modalidade);
  const mensal = options.mensal === true;
  const itens = [];
  for (const p of perfis) {
    const linha = buscarPerfil(p.perfil, linhas);
    const tarifaHora = linha ? (regime === 'HO' ? linha.horaHO : linha.horaHib) : 0;
    const tarifaMensal168 = linha ? (regime === 'HO' ? linha.mensalHO : linha.mensalHib) : 0;
    const horasMensais = Math.max(1, Number(p.horas_mensais) || 1);
    const meses = Math.max(1, Number(p.meses) || 1);
    const quantidade = Math.max(1, Number(p.quantidade) || 1);
    const proporcao = horasMensais / 168;
    const tarifaMensalProp = tarifaMensal168 * proporcao;
    const subtotal = tarifaMensalProp * quantidade * (mensal ? 1 : meses);
    itens.push({ perfil_original: p.perfil, perfil_ratecard: linha?.perfil ?? p.perfil, quantidade, horas_mensais: horasMensais, meses, tarifa_hora: tarifaHora, tarifa_mensal_168: tarifaMensal168, tarifa_mensal_proporcional: tarifaMensalProp, subtotal, encontrado: !!linha });
  }
  const valor_total = itens.reduce((s,i)=>s+i.subtotal,0);
  return { itens, valor_total };
}

const perfis = [
  { perfil: 'Analista de Qualidade Pleno', quantidade:1, horas_mensais:160, meses:12 },
  { perfil: 'Analista de Qualidade Sênior', quantidade:1, horas_mensais:160, meses:12 },
];

const result = recalcular(perfis, 'PJ', 'HO', { mensal: false });
console.log('Resultado:', result.valor_total);
console.log(result.itens);
