#!/usr/bin/env node
// Valida os 4 golpes de cada espécie contra docs/golpes-catalogo.md.
// Uso: node scripts/validar-golpes.js [idMax]
const fs = require('fs');
const path = require('path');
const pk = require(path.join(__dirname, '..', 'lib', 'cenario')).criaturas();
const idMax = Number(process.argv[2]) || 999;
const PESO_DADO = { d4: 1, d6: 2, d8: 3, d12: 5 };
const PESO_CARGAS = { 3: -1, 2: -1, 1: -2 };
const PESO_EFEITO = { fraqueza: 1, veneno: 2, paralisia: 2, sono: 2, ligeiro: 1, escudo: 1, forca_extra: 2, cura: 2 };
const ORC = { inicial: 6, intermediaria: 9, final: 12, sem_evolucao: 11, raro: 16 };
const ATRIB = [null, 'forca', 'energia'];
const ELEMS = new Set(['normal','fogo','agua','planta','eletrico','gelo','lutador','veneno','terra','voador','psiquico','inseto','pedra','fantasma','dragao']);
const CAMPOS = ['nome','icone','elemento','atributo','dado','cargas','efeito','area','peso','liberado_em'];

function peso(g) {
  const p = (g.dado ? PESO_DADO[g.dado] : 0) + (g.cargas ? PESO_CARGAS[g.cargas] : 0) +
    (g.efeito ? PESO_EFEITO[g.efeito] : 0) + (g.area ? 2 : 0);
  return Math.max(0, p);
}
function estagio(x) {
  if (x.raro) return 'raro';
  const ev = x.evolucao && x.evolucao.length > 0, herda = !!x.herda_atributos;
  if (!herda && ev) return 'inicial';
  if (herda && ev) return 'intermediaria';
  if (herda) return 'final';
  return 'sem_evolucao';
}
const erros = [];
const contDado = {}, contEfeito = {};
let area = 0, total = 0;
const nomesPorEspecie = {};
for (const x of pk) {
  if (x.id > idMax) continue;
  const e = (m) => erros.push(`#${x.id} ${x.nome}: ${m}`);
  const gs = x.golpes;
  if (!Array.isArray(gs) || gs.length !== 4) { e('não tem 4 golpes'); continue; }
  const est = estagio(x);
  let soma = 0, suportes = 0, principal = false;
  const dados = new Set();
  gs.forEach((g, i) => {
    for (const c of CAMPOS) if (!(c in g)) e(`golpe ${i + 1} sem campo ${c}`);
    for (const c of Object.keys(g)) if (!CAMPOS.includes(c)) e(`golpe ${i + 1} campo extra ${c}`);
    if (!g.nome || !g.icone) e(`golpe ${i + 1} sem nome/ícone`);
    if (!ELEMS.has(g.elemento)) e(`golpe ${i + 1} elemento inválido ${g.elemento}`);
    if (g.dado !== null && !(g.dado in PESO_DADO)) e(`golpe ${i + 1} dado inválido`);
    if (g.dado === null) { suportes++; if (g.atributo !== null && g.atributo !== undefined && !ATRIB.includes(g.atributo)) e(`golpe ${i + 1} atributo inválido`); }
    else if (g.atributo !== 'forca' && g.atributo !== 'energia') e(`golpe ${i + 1} atributo inválido ${g.atributo}`);
    if (g.cargas !== null && ![1, 2, 3].includes(g.cargas)) e(`golpe ${i + 1} cargas inválidas`);
    if (g.efeito !== null && !(g.efeito in PESO_EFEITO)) e(`golpe ${i + 1} efeito inválido ${g.efeito}`);
    if (typeof g.area !== 'boolean') e(`golpe ${i + 1} area não booleano`);
    if (g.liberado_em !== i + 1) e(`golpe ${i + 1} liberado_em ${g.liberado_em}`);
    if (g.dado === null && g.efeito === null) e(`golpe ${i + 1} suporte sem efeito`);
    if (g.dado === 'd12' && est !== 'final' && est !== 'raro' && est !== 'sem_evolucao') e(`d12 em estágio ${est}`);
    if (peso(g) !== g.peso) e(`golpe ${i + 1} peso ${g.peso} != calculado ${peso(g)}`);
    soma += peso(g);
    if (g.elemento === x.tipos[0]) principal = true;
    dados.add(g.dado);
    contDado[g.dado || 'suporte'] = (contDado[g.dado || 'suporte'] || 0) + 1;
    contEfeito[g.efeito || 'nenhum'] = (contEfeito[g.efeito || 'nenhum'] || 0) + 1;
    if (g.area) area++;
    total++;
    (nomesPorEspecie[g.nome] = nomesPorEspecie[g.nome] || new Set()).add(x.id);
  });
  if (gs[0].cargas !== null) e('golpe 1 não é ilimitado');
  if (suportes > 1) e('mais de 1 suporte');
  if (!principal) e(`nenhum golpe do elemento principal (${x.tipos[0]})`);
  if (dados.size < 2) e('menos de 2 dados diferentes');
  const orc = ORC[est];
  if (soma > orc || soma < orc - 1) e(`soma ${soma} fora do orçamento ${orc} (${est})`);
}
// forma final/rara precisa de pelo menos 1 nome exclusivo (só dessa espécie)
for (const x of pk) {
  if (x.id > idMax || !Array.isArray(x.golpes)) continue;
  const est = estagio(x);
  if (est === 'final' || est === 'raro') {
    if (!x.golpes.some((g) => nomesPorEspecie[g.nome] && nomesPorEspecie[g.nome].size === 1))
      erros.push(`#${x.id} ${x.nome}: sem golpe com nome exclusivo`);
  }
}
if (erros.length) { console.log(erros.join('\n')); console.log(`\n${erros.length} erro(s)`); process.exit(1); }
console.log(`OK: ${pk.filter((x) => x.id <= idMax).length} espécies, ${total} golpes`);
console.log('por dado:', JSON.stringify(contDado));
console.log('por efeito:', JSON.stringify(contEfeito));
console.log('em área:', area);
