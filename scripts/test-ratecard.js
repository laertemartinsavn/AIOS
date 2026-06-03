const XLSX = require('xlsx');
const path = require('path');

function lerLinhas(modalidade = 'PJ') {
  const arquivo = path.join(process.cwd(), 'Ratecard', 'Rate Card - PJ e CLT - Oficial.xlsx');
  try {
    const wb = XLSX.readFile(arquivo);
    const nomeAba = modalidade === 'CLT' ? 'Rate Formatado CLT' : 'Rate Formatado PJ';
    const ws = wb.Sheets[nomeAba];
    if (!ws) { console.log('Aba não encontrada', nomeAba); return []; }
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
  } catch (e) {
    console.error('Erro ao ler arquivo:', e.message);
    return [];
  }
}

console.log('Lendo PJ...');
const pj = lerLinhas('PJ');
console.log('PJ linhas:', pj.length);
console.log(pj.slice(0,10));

console.log('\nLendo CLT...');
const clt = lerLinhas('CLT');
console.log('CLT linhas:', clt.length);
console.log(clt.slice(0,10));
