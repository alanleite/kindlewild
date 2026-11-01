'use strict';

// Calibração: cada espécie enfrenta todas as outras do mesmo estágio (todos contra todos),
// nos progressos 10, 35 e 70. Também mede a vantagem entre estágios (forma final contra inicial).
// Uso: node sim/calibrar.js [--n 200] [--saida cenarios/<id>/propostas/calibracao.json]

const fs = require('fs');
const path = require('path');
const { DADOS_PADRAO, montarCarta } = require('./carta');
const cenario = require('../lib/cenario');
const { batalha, criarRng, SEMENTE_PADRAO } = require('./motor');
const { obterPoliticaGolpe } = require('./politica');

const PROGRESSOS = [10, 35, 70];

function estagio(e) {
  if (e.raro) return 'raro';
  const evolui = Array.isArray(e.evolucao) && e.evolucao.length > 0;
  if (e.herda_atributos) return evolui ? 'intermediaria' : 'final';
  return evolui ? 'inicial' : 'sem_evolucao';
}

function argumento(nome, padrao) {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : padrao;
}

function confronto(a, b, prog, n, politica) {
  const cartaA = montarCarta(a, { progresso: prog, estrelas: 'igual' });
  const cartaB = montarCarta(b, { progresso: prog, estrelas: 'igual' });
  const rng = criarRng(SEMENTE_PADRAO);
  let vit = 0;
  for (let i = 0; i < n; i += 1) {
    const r = batalha(cartaA, cartaB, { rng, politica, log: false });
    if (r.vencedor === 'a') vit += 1;
    else if (r.vencedor !== 'b') vit += 0.5;
  }
  return vit / n;
}

function main() {
  const n = Number(argumento('--n', 200));
  const saida = argumento('--saida', path.join(cenario.pasta(), 'propostas', 'calibracao.json'));
  const dados = DADOS_PADRAO;
  const politica = obterPoliticaGolpe('padrao');

  const grupos = {};
  for (const e of dados) (grupos[estagio(e)] = grupos[estagio(e)] || []).push(e);

  const especies = {};
  for (const [nomeGrupo, lista] of Object.entries(grupos)) {
    for (const prog of PROGRESSOS) {
      const soma = new Map(lista.map((e) => [e.nome, 0]));
      for (let i = 0; i < lista.length; i += 1) {
        for (let j = i + 1; j < lista.length; j += 1) {
          const p = confronto(lista[i], lista[j], prog, n, politica);
          soma.set(lista[i].nome, soma.get(lista[i].nome) + p);
          soma.set(lista[j].nome, soma.get(lista[j].nome) + (1 - p));
        }
      }
      for (const e of lista) {
        const media = lista.length > 1 ? soma.get(e.nome) / (lista.length - 1) : 0.5;
        especies[e.nome] = especies[e.nome] || { id: e.id, estagio: nomeGrupo, vitoria: {} };
        especies[e.nome].vitoria[prog] = Number(media.toFixed(3));
      }
    }
  }

  // Vantagem entre estágios: média de vitória de um estágio contra outro, em progresso 35.
  const pares = [['intermediaria', 'inicial'], ['final', 'intermediaria'], ['final', 'inicial'], ['sem_evolucao', 'final'], ['raro', 'final']];
  const entreEstagios = {};
  for (const [x, y] of pares) {
    let s = 0;
    let c = 0;
    for (const a of grupos[x] || []) {
      for (const b of grupos[y] || []) {
        s += confronto(a, b, 35, Math.max(20, Math.floor(n / 4)), politica);
        c += 1;
      }
    }
    entreEstagios[`${x} x ${y}`] = c ? Number((s / c).toFixed(3)) : null;
  }

  const fora = Object.entries(especies)
    .filter(([, v]) => v.estagio !== 'raro' && (v.vitoria[35] < 0.4 || v.vitoria[35] > 0.6))
    .map(([nome, v]) => ({ nome, estagio: v.estagio, p35: v.vitoria[35] }))
    .sort((a, b) => a.p35 - b.p35);

  const resultado = { n, progresso: PROGRESSOS, faixa: [0.4, 0.6], especies, entreEstagios, fora };
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, JSON.stringify(resultado, null, 2));
  console.log(`Fora da faixa em p35: ${fora.length} de ${Object.keys(especies).length}`);
  console.log('Entre estágios (p35):', JSON.stringify(entreEstagios));
}

if (require.main === module) main();

module.exports = { estagio };
