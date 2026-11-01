#!/usr/bin/env node
'use strict';

// CLI do simulador. Uso:
//   node sim/rodar.js <A> <B> [--progresso 10,25,50] [--n 2000] [--politica padrao|aleatoria]
//                     [--estrelas igual|forca|agilidade] [--seed 12345]
//   node sim/rodar.js --listar
// A e B aceitam lista separada por vírgula (todos contra todos). Nome ou número da criatura.

const { DADOS_PADRAO, buscarEspecie, montarCarta, listarPoliticasEstrelas } = require('./carta');
const { batalha, criarRng, SEMENTE_PADRAO } = require('./motor');
const { obterPoliticaGolpe } = require('./politica');

const PADRAO = { progresso: '10,35,70', n: 2000, politica: 'padrao', estrelas: 'igual', seed: SEMENTE_PADRAO };

function lerArgs(argv) {
  const posicionais = [];
  const opcoes = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--listar') opcoes.listar = true;
    else if (a === '--ajuda' || a === '-h' || a === '--help') opcoes.ajuda = true;
    else if (a.startsWith('--')) {
      const chave = a.slice(2);
      const valor = argv[i + 1];
      if (valor === undefined || valor.startsWith('--')) throw new Error(`Falta valor para ${a}.`);
      opcoes[chave] = valor;
      i += 1;
    } else posicionais.push(a);
  }
  return { posicionais, opcoes };
}

function inteiro(valor, nome, min, max) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || (max !== undefined && n > max)) {
    throw new Error(`${nome} inválido: "${valor}".`);
  }
  return n;
}

function fmtPct(x) {
  return `${(x * 100).toFixed(1).replace('.', ',')}%`;
}

function fmtNum(x) {
  return x.toFixed(1).replace('.', ',');
}

function ajuda() {
  return [
    'Uso: node sim/rodar.js <A> <B> [opções]',
    '',
    '  A, B          nome ou número da criatura; lista separada por vírgula (ex.: 25,26)',
    '  --progresso   posições do trilho, separadas por vírgula (padrão 10,35,70; cada valor de 0 a 70)',
    '  --n           simulações por confronto (padrão 2000)',
    '  --politica    escolha de golpe: padrao (maior valor esperado: dano + efeito) | aleatoria (padrão padrao)',
    `  --estrelas    distribuição das estrelas: ${listarPoliticasEstrelas().join(' | ')} (padrão igual)`,
    `  --seed        semente (padrão ${SEMENTE_PADRAO}); mesma semente, mesmo resultado`,
    '  --listar      lista as espécies disponíveis',
  ].join('\n');
}

function listar() {
  return DADOS_PADRAO.map((e) => `${String(e.id).padStart(3, '0')} ${e.nome}`).join('\n');
}

function rodar(argv) {
  const { posicionais, opcoes } = lerArgs(argv);
  if (opcoes.ajuda) return ajuda();
  if (opcoes.listar) return listar();

  if (posicionais.length !== 2) throw new Error('Informe duas espécies (A e B). Use --ajuda para ver as opções.');

  const n = inteiro(opcoes.n !== undefined ? opcoes.n : PADRAO.n, '--n', 1);
  const seed = inteiro(opcoes.seed !== undefined ? opcoes.seed : PADRAO.seed, '--seed', 0);
  const politica = obterPoliticaGolpe(opcoes.politica || PADRAO.politica);
  const estrelas = opcoes.estrelas || PADRAO.estrelas;
  const progressos = (opcoes.progresso || PADRAO.progresso)
    .split(',')
    .map((p) => inteiro(p.trim(), '--progresso', 0, 70));

  const listaA = posicionais[0].split(',').map((s) => buscarEspecie(s.trim()));
  const listaB = posicionais[1].split(',').map((s) => buscarEspecie(s.trim()));

  const linhas = [];
  linhas.push(`Simulador de batalhas | N=${n} | política de golpe: ${politica.nome} | estrelas: ${estrelas} | semente: ${seed}`);
  linhas.push('');
  const cabecalho = ['Progr.', 'A', 'B', `Vit. A`, `Vit. B`, 'Empate', 'Turnos (média)'];
  const larguras = [6, 16, 16, 9, 9, 9, 15];
  const formatar = (cols) => cols.map((c, i) => String(c).padEnd(larguras[i])).join(' ').trimEnd();
  linhas.push(formatar(cabecalho));
  linhas.push(larguras.map((l) => '-'.repeat(l - 1)).join(' '));

  for (const prog of progressos) {
    for (const especieA of listaA) {
      for (const especieB of listaB) {
        const cartaA = montarCarta(especieA, { progresso: prog, estrelas });
        const cartaB = montarCarta(especieB, { progresso: prog, estrelas });
        // Mesma semente em cada confronto: resultados comparáveis entre espécies.
        const rng = criarRng(seed);
        let vitA = 0;
        let vitB = 0;
        let empates = 0;
        let somaTurnos = 0;
        for (let i = 0; i < n; i += 1) {
          const r = batalha(cartaA, cartaB, { rng, politica, log: false });
          if (r.vencedor === 'a') vitA += 1;
          else if (r.vencedor === 'b') vitB += 1;
          else empates += 1;
          somaTurnos += r.turnos;
        }
        linhas.push(formatar([
          prog,
          especieA.nome,
          especieB.nome,
          fmtPct(vitA / n),
          fmtPct(vitB / n),
          fmtPct(empates / n),
          fmtNum(somaTurnos / n),
        ]));
      }
    }
  }
  linhas.push('');
  linhas.push('Empate = batalha que chegou ao limite de 1000 turnos sem KO (ex.: Agilidade acima de 10 que nunca é acertada).');
  return linhas.join('\n');
}

if (require.main === module) {
  try {
    console.log(rodar(process.argv.slice(2)));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

module.exports = { rodar };
