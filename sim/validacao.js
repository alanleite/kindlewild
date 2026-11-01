#!/usr/bin/env node
'use strict';

// Testes de validação do motor. Uso: node sim/validacao.js
// Sai com código 1 se algum teste falhar.

const path = require('path');
const {
  criarRng, resolverAtaque, calcularDano, probAcerto, batalha, aplicarEfeito, agilidadeEfetiva, rolar,
} = require('./motor');
const { montarCartaSintetica, montarCarta, buscarEspecie, normalizarGolpe, DADOS_PADRAO } = require('./carta');
const { padrao, aleatoria } = require('./politica');
const FIXTURES = require(path.join(__dirname, 'fixtures', 'especies.json'));

let falhas = 0;
function teste(nome, fn) {
  try {
    const detalhe = fn();
    console.log(`OK    ${nome}${detalhe ? ` (${detalhe})` : ''}`);
  } catch (erro) {
    falhas += 1;
    console.log(`FALHA ${nome}: ${erro.message}`);
  }
}
function afirmar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

const N = 100000;

// Golpe de teste: 1d6 + Força 2, físico, tipo normal.
function atacante(forca = 2, energia = 0) {
  return montarCartaSintetica({ forca, energia, golpes: [{ dado: 'd6', atributo: 'forca', elemento: 'normal' }] });
}

teste('1d6 + 2 contra Defesa 0, sem fraqueza: dano entre 3 e 8', () => {
  const rng = criarRng(1);
  const a = atacante(2);
  const alvo = montarCartaSintetica({ agilidade: 0, defesa: 0 });
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolverAtaque(a, alvo, a.golpes[0], rng);
    afirmar(r.acertou, 'com Agilidade 0 deveria acertar');
    min = Math.min(min, r.dano);
    max = Math.max(max, r.dano);
  }
  afirmar(min === 3 && max === 8, `min ${min}, max ${max}`);
  return `min ${min}, max ${max}`;
});

teste('Defesa 10: dano é 0 quando o cálculo dá negativo (não há mínimo 1 por acerto)', () => {
  const rng = criarRng(2);
  const a = atacante(2);
  const alvo = montarCartaSintetica({ agilidade: 0, defesa: 10 });
  let zeros = 0;
  let outros = 0;
  for (let i = 0; i < N; i += 1) {
    const r = resolverAtaque(a, alvo, a.golpes[0], rng);
    if (r.dano === 0) zeros += 1;
    else outros += 1;
  }
  afirmar(outros === 0, `${outros} danos diferentes de 0 com Defesa 10 e máximo 8`);
  // Regra de empate: subtotal igual à Defesa dá 1. Confirmado com valores fixos.
  afirmar(calcularDano({ dado: 3, atributo: 0, defesa: 3 }) === 1, 'zero depois da Defesa deveria dar 1');
  afirmar(calcularDano({ dado: 2, atributo: 0, defesa: 3 }) === 0, 'negativo depois da Defesa deveria dar 0');
  return `${zeros} zeros em ${N}`;
});

teste('Alvo imune: dano sempre 0', () => {
  const rng = criarRng(3);
  const a = atacante(5);
  const alvo = montarCartaSintetica({ agilidade: 0, defesa: 0, resistencias: { normal: 'imune' } });
  for (let i = 0; i < N; i += 1) {
    const r = resolverAtaque(a, alvo, a.golpes[0], rng);
    afirmar(r.dano === 0, `dano ${r.dano} em alvo imune`);
  }
  afirmar(calcularDano({ dado: 6, atributo: 5, efeito: 'imune', defesa: 0 }) === 0, 'imune com Defesa 0 deveria dar 0');
  return 'sempre 0';
});

teste('Alvo vulnerável ×2, golpe 1d4 + 0: dano entre 2 e 8, menos Defesa', () => {
  const rng = criarRng(4);
  const a = montarCartaSintetica({ golpes: [{ dado: 'd4', atributo: 'energia', elemento: 'eletrico' }], energia: 0 });
  const alvo = montarCartaSintetica({ agilidade: 0, defesa: 0, resistencias: { eletrico: 'vulneravel' } });
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolverAtaque(a, alvo, a.golpes[0], rng);
    min = Math.min(min, r.dano);
    max = Math.max(max, r.dano);
  }
  afirmar(min === 2 && max === 8, `min ${min}, max ${max}`);
  // Com Defesa 1: (1..4)*2 - 1 = 1..7
  const alvoDef = montarCartaSintetica({ agilidade: 0, defesa: 1, resistencias: { eletrico: 'vulneravel' } });
  let min2 = Infinity;
  let max2 = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolverAtaque(a, alvoDef, a.golpes[0], rng);
    min2 = Math.min(min2, r.dano);
    max2 = Math.max(max2, r.dano);
  }
  afirmar(min2 === 1 && max2 === 7, `com Defesa 1: min ${min2}, max ${max2}`);
  return `sem Defesa: ${min}..${max}; Defesa 1: ${min2}..${max2}`;
});

teste('Agilidade 0 do alvo: acerto em 100% dos casos', () => {
  const rng = criarRng(5);
  const a = atacante(1);
  const alvo = montarCartaSintetica({ agilidade: 0 });
  let erros = 0;
  for (let i = 0; i < N; i += 1) {
    if (!resolverAtaque(a, alvo, a.golpes[0], rng).acertou) erros += 1;
  }
  afirmar(erros === 0, `${erros} erros em ${N}`);
  return `${N} de ${N}`;
});

teste('Agilidade 8 do alvo: acerto em 30% (±2 pontos percentuais)', () => {
  const rng = criarRng(6);
  const a = atacante(1);
  const alvo = montarCartaSintetica({ agilidade: 8 });
  let acertos = 0;
  for (let i = 0; i < N; i += 1) {
    if (resolverAtaque(a, alvo, a.golpes[0], rng).acertou) acertos += 1;
  }
  const taxa = acertos / N;
  afirmar(Math.abs(taxa - 0.3) <= 0.02, `taxa ${taxa}`);
  return `taxa ${(taxa * 100).toFixed(2)}%`;
});

teste('Tabela de acerto: P(d10 >= Agilidade) para 0 a 11', () => {
  const esperado = [1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];
  esperado.forEach((p, ag) => afirmar(probAcerto(ag) === p, `Agilidade ${ag}`));
  return 'exata';
});

teste('Batalha: mesma semente, mesmo resultado', () => {
  const x = batalha(montarCartaSintetica({ vida: 5, forca: 2 }), montarCartaSintetica({ vida: 5, agilidade: 2 }), { seed: 99 });
  const y = batalha(montarCartaSintetica({ vida: 5, forca: 2 }), montarCartaSintetica({ vida: 5, agilidade: 2 }), { seed: 99 });
  afirmar(JSON.stringify(x) === JSON.stringify(y), 'resultados diferentes');
  return `vencedor ${x.vencedor}`;
});

teste('Batalha: alvo com vida zero perde e o log existe', () => {
  const r = batalha(montarCartaSintetica({ vida: 3, forca: 9, agilidade: 0 }), montarCartaSintetica({ vida: 1, agilidade: 0 }), { seed: 7 });
  afirmar(r.vencedor === 'a' && r.motivo === 'KO', `vencedor ${r.vencedor} motivo ${r.motivo}`);
  afirmar(Array.isArray(r.log) && r.log.length > 0, 'log vazio');
  return `KO em ${r.turnos} turno(s)`;
});

teste('Golpe com cargas esgotadas não é escolhido', () => {
  const a = montarCartaSintetica({
    forca: 3,
    golpes: [{ nome: 'Basico', dado: 'd4' }, { nome: 'Limitado', dado: 'd8', cargas: 1, bonus: 0 }],
  });
  // O limitado é mais forte, mas só tem 1 uso.
  const alvo = montarCartaSintetica({ vida: 50, agilidade: 0 });
  const r = batalha(a, alvo, { seed: 3, maxTurnos: 10 });
  const usosLimitado = r.log.filter((e) => e.golpe === 'Limitado').length;
  afirmar(usosLimitado === 1, `Limitado usado ${usosLimitado} vezes`);
  return 'usado 1 vez';
});

teste('Carta de dados: vida = vida base + corações do trilho até o progresso; golpes liberados pelo trilho', () => {
  const base = DADOS_PADRAO.find((e) => e.trilho.some((m) => m.tipo === 'coracao'));
  const c = montarCarta(base, { progresso: 70 });
  const cor = base.trilho.filter((m) => m.tipo === 'coracao').length;
  afirmar(c.vidaMax === Math.min(16, base.vida + cor), `vidaMax ${c.vidaMax}`);
  afirmar(c.golpes.every((g) => g.liberado), 'nem todos os golpes liberados no 70');
  const c0 = montarCarta(base, { progresso: 0 });
  afirmar(c0.vidaMax === base.vida && c0.golpes.filter((g) => g.liberado).length === 1, 'progresso 0: só o golpe 1');
  return `vida ${c.vidaMax}`;
});

teste('Todas as espécies cabem no limite físico de 16 corações da carta', () => {
  const acimaDoLimite = [];
  for (const especie of DADOS_PADRAO) {
    if (especie.vida > 16) acimaDoLimite.push(`${especie.nome} (${especie.vida})`);
  }
  afirmar(acimaDoLimite.length === 0, `acima de 16: ${acimaDoLimite.join(', ')}`);
  return 'máximo 16';
});

teste('Evolução: a forma evoluída copia o valor da forma anterior (sem +1) e tem trilho novo', () => {
  const base = DADOS_PADRAO.find((e) => !e.herda_atributos && (e.evolucao || []).length > 0);
  const evoluida = buscarEspecie(base.evolucao[0].para);
  const cp = montarCarta(base, { progresso: base.evolucao[0].pos, estrelas: 'igual' });
  const cr = montarCarta(evoluida, { progresso: 0, estrelas: 'igual' });
  for (const a of ['forca', 'energia', 'agilidade', 'defesa']) {
    afirmar(cr.atributos[a].base === cp.atributos[a].valor, `${a}: base ${cr.atributos[a].base} vs valor ${cp.atributos[a].valor}`);
  }
  afirmar(cr.marcas.estrelasFeitas === 0 && cr.marcas.coracoes === 0, 'trilho da nova carta deveria começar vazio');
  return 'copiado sem +1';
});

// ---------------------------------------------------------------------------
// Formato novo de golpe: dados, atributos, cargas, efeitos, área, vida.
// ---------------------------------------------------------------------------

// Política de teste: usa o primeiro nome da lista que esteja disponível; senão o primeiro golpe disponível.
function prefere(...nomes) {
  return {
    nome: 'prefere',
    escolher(atk, def, disponiveis) {
      for (const n of nomes) {
        const i = disponiveis.findIndex((g) => g.nome === n);
        if (i >= 0) return i;
      }
      return 0;
    },
  };
}

// Corpo passivo: defesa altíssima, não faz nada de útil (golpe de 1 dado d4 contra Defesa 99 = 0).
function parede(opcoes = {}) {
  return montarCartaSintetica({ defesa: 99, vida: 100, ...opcoes });
}

const ataques = (cartaLog, lado) => cartaLog.filter((e) => e.lado === lado && e.golpe);

teste('d12: dano de 1 a 12 (Força 0, sem Defesa)', () => {
  const rng = criarRng(21);
  const a = montarCartaSintetica({ golpes: [{ dado: 'd12', atributo: 'forca', elemento: 'normal' }] });
  const alvo = montarCartaSintetica({ agilidade: 0 });
  afirmar(a.golpes[0].lados === 12, 'lados do d12');
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolverAtaque(a, alvo, a.golpes[0], rng);
    min = Math.min(min, r.dano);
    max = Math.max(max, r.dano);
  }
  afirmar(min === 1 && max === 12, `min ${min}, max ${max}`);
  return `${min}..${max}`;
});

teste('Atributo do golpe: energia soma Energia, forca soma Força; elemento (não o atributo) decide a resistência', () => {
  const rng = criarRng(22);
  const a = montarCartaSintetica({
    forca: 0, energia: 5,
    golpes: [{ dado: 'd4', atributo: 'energia', elemento: 'fogo' }, { dado: 'd4', atributo: 'forca', elemento: 'fogo' }],
  });
  const alvo = montarCartaSintetica({ agilidade: 0 });
  let min = Infinity;
  let max = -Infinity;
  let max2 = -Infinity;
  for (let i = 0; i < 2000; i += 1) {
    const r = resolverAtaque(a, alvo, a.golpes[0], rng);
    min = Math.min(min, r.dano);
    max = Math.max(max, r.dano);
    max2 = Math.max(max2, resolverAtaque(a, alvo, a.golpes[1], rng).dano);
  }
  afirmar(min === 6 && max === 9, `energia: ${min}..${max}`);
  afirmar(max2 === 4, `forca 0: máximo ${max2}`);
  const imune = montarCartaSintetica({ agilidade: 0, resistencias: { fogo: 'imune' } });
  afirmar(resolverAtaque(a, imune, a.golpes[1], rng).dano === 0, 'imune a fogo');
  const resist = montarCartaSintetica({ agilidade: 0, resistencias: { fogo: 'resistente' } });
  for (let i = 0; i < 500; i += 1) {
    const r = resolverAtaque(a, resist, a.golpes[0], rng); // (1..4 + 5) / 2 arredondado pra cima = 3..5
    afirmar(r.dano >= 3 && r.dano <= 5, `resistente: ${r.dano}`);
  }
  return 'ok';
});

teste('Zero depois da Defesa com acerto vira 1; imune continua 0', () => {
  afirmar(calcularDano({ dado: 4, atributo: 0, defesa: 4 }) === 1, 'zero -> 1');
  afirmar(calcularDano({ dado: 4, atributo: 0, efeito: 'imune', defesa: 0 }) === 0, 'imune -> 0');
  afirmar(calcularDano({ dado: 2, atributo: 0, defesa: 4 }) === 0, 'negativo -> 0');
  return 'ok';
});

teste('Cargas: consome 1 por uso, mesmo errando; esgotado nunca é escolhido', () => {
  const a = montarCartaSintetica({
    vida: 1000,
    golpes: [{ nome: 'Basico', dado: 'd4' }, { nome: 'Limitado', dado: 'd12', cargas: 2 }],
  });
  const alvo = montarCartaSintetica({ vida: 1000, agilidade: 8, defesa: 99 });
  for (let seed = 1; seed <= 30; seed += 1) {
    const r = batalha(a, alvo, { seed, maxTurnos: 60, politica: prefere('Limitado') });
    const usos = ataques(r.log, 'a').filter((e) => e.golpe === 'Limitado');
    afirmar(usos.length === 2, `seed ${seed}: Limitado usado ${usos.length} vezes`);
  }
  // Com Agilidade 8 (30% de acerto) alguns usos erram, e a carga é gasta mesmo assim.
  let erros = 0;
  for (let seed = 1; seed <= 30; seed += 1) {
    const r = batalha(a, alvo, { seed, maxTurnos: 60, politica: prefere('Limitado') });
    erros += ataques(r.log, 'a').filter((e) => e.golpe === 'Limitado' && !e.acertou).length;
  }
  afirmar(erros > 0, 'nenhum uso errado nas 30 seeds');
  return '2 usos em 30 seeds';
});

teste('Golpe 1 sempre ilimitado, mesmo que o JSON traga cargas', () => {
  const novo = FIXTURES.find((e) => e.nome === 'Novo');
  afirmar(novo.golpes[0].cargas === 3, 'fixture deveria trazer cargas 3 no golpe 1');
  const c = montarCarta(novo, { progresso: 70 });
  afirmar(c.golpes[0].cargas === null, 'golpe 1 deveria ser ilimitado');
  afirmar(c.golpes[1].cargas === 1 && c.golpes[2].cargas === 2, 'cargas dos outros golpes');
  return 'ok';
});

teste('Fixture: golpes liberados pelas marcas de habilidade (detalhe numérico), d12 e área', () => {
  const novo = FIXTURES.find((e) => e.nome === 'Novo');
  const lib = (p) => montarCarta(novo, { progresso: p }).golpes.map((g) => g.liberado);
  afirmar(JSON.stringify(lib(0)) === '[true,false,false,false]', 'progresso 0');
  afirmar(JSON.stringify(lib(5)) === '[true,true,false,false]', 'progresso 5');
  afirmar(JSON.stringify(lib(12)) === '[true,true,true,false]', 'progresso 12');
  afirmar(JSON.stringify(lib(30)) === '[true,true,true,true]', 'progresso 30');
  const c = montarCarta(novo, { progresso: 70 });
  afirmar(c.golpes[1].lados === 12 && c.golpes[1].area === true && c.golpes[1].atributo === 'energia', 'd12 energia área');
  afirmar(c.golpes[2].lados === null && c.golpes[2].efeito === 'sono', 'suporte sem dado');
  afirmar(montarCarta(novo, { progresso: 49 }).golpes[1].bonus === 0 && c.golpes[1].bonus === 1, 'Poder em 50');
  return 'ok';
});

teste('Formato antigo (tipo/categoria/usos) é convertido', () => {
  const g = normalizarGolpe({ nome: 'Jato', tipo: 'agua', categoria: 'elemental', dado: 'd8', usos: 2 });
  afirmar(g.elemento === 'agua' && g.atributo === 'energia' && g.cargas === 2 && g.efeito === null && g.area === false, JSON.stringify(g));
  const f = normalizarGolpe({ nome: 'Soco', tipo: 'normal', categoria: 'fisico', dado: 'd4', usos: null });
  afirmar(f.atributo === 'forca' && f.cargas === null, 'físico ilimitado');
  const legado = FIXTURES.find((e) => e.nome === 'Legado');
  const c9 = montarCarta(legado, { progresso: 9 });
  const c10 = montarCarta(legado, { progresso: 10 });
  afirmar(!c9.golpes[1].liberado && c10.golpes[1].liberado, 'liberação pela marca antiga (nome)');
  afirmar(c10.golpes[1].cargas === 2 && c10.golpes[1].elemento === 'agua', 'campos convertidos na carta');
  const sint = montarCartaSintetica({ golpes: [{ tipo: 'fogo', categoria: 'elemental', usos: 1, dado: 'd6' }] });
  afirmar(sint.golpes[0].elemento === 'fogo' && sint.golpes[0].atributo === 'energia' && sint.golpes[0].cargas === 1, 'sintética aceita o antigo');
  return 'ok';
});

teste('Teto de 16 de vida: vida base + corações do trilho, no máximo 16', () => {
  const v = FIXTURES.find((e) => e.nome === 'Vida16');
  afirmar(montarCarta(v, { progresso: 7 }).vidaMax === 15, 'antes dos corações');
  afirmar(montarCarta(v, { progresso: 8 }).vidaMax === 16, 'um coração: 16');
  afirmar(montarCarta(v, { progresso: 70 }).vidaMax === 16, '15 + 3 = 18 vira 16');
  const novo = FIXTURES.find((e) => e.nome === 'Novo');
  afirmar(montarCarta(novo, { progresso: 70 }).vidaMax === 16, 'Novo no teto');
  const legado = FIXTURES.find((e) => e.nome === 'Legado');
  afirmar(montarCarta(legado, { progresso: 70 }).vidaMax === 9, 'abaixo do teto soma normalmente');
  return 'ok';
});

teste('Agilidade efetiva: teto 8; Ligeiro +3 com teto 8', () => {
  const alta = montarCartaSintetica({ agilidade: 12 });
  afirmar(agilidadeEfetiva(alta) === 8, 'base 12 -> 8');
  const media = montarCartaSintetica({ agilidade: 6 });
  media.tokens.ligeiro = true;
  afirmar(agilidadeEfetiva(media) === 8, '6+3 -> teto 8');
  const baixa = montarCartaSintetica({ agilidade: 0 });
  baixa.tokens.ligeiro = true;
  afirmar(agilidadeEfetiva(baixa) === 3, '0+3 = 3');
  // Acerto contra Agilidade 12 (efetiva 8): 30%.
  const rng = criarRng(23);
  const a = atacante(1);
  let acertos = 0;
  for (let i = 0; i < N; i += 1) if (resolverAtaque(a, alta, a.golpes[0], rng).acertou) acertos += 1;
  afirmar(Math.abs(acertos / N - 0.3) <= 0.02, `taxa ${acertos / N}`);
  return 'ok';
});

teste('Suporte positivo não rola acerto e aplica o efeito em si', () => {
  const a = montarCartaSintetica({ agilidade: 9, golpes: [{ nome: 'Escudo', dado: null, atributo: null, efeito: 'escudo' }] });
  const alvo = parede({ agilidade: 8 });
  const r = batalha(a, alvo, { seed: 1, maxTurnos: 1 });
  const e = r.log.find((x) => x.golpe === 'Escudo');
  afirmar(e && e.rolagemAcerto === undefined && e.acertou === undefined, 'não deveria rolar acerto');
  afirmar(e.efeitoAplicado.efeito === 'escudo' && e.efeitoAplicado.jaTinha === false, 'efeito em si');
  return 'ok';
});

teste('Suporte negativo rola acerto contra o alvo (Agilidade 8: ~30%)', () => {
  const a = montarCartaSintetica({ agilidade: 9, golpes: [{ nome: 'Sono', dado: null, atributo: null, efeito: 'sono' }] });
  const alvo = parede({ agilidade: 8 });
  let acertos = 0;
  const M = 5000;
  for (let seed = 1; seed <= M; seed += 1) {
    const r = batalha(a, alvo, { seed, maxTurnos: 1 });
    const e = r.log.find((x) => x.golpe === 'Sono');
    afirmar(e.rolagemAcerto !== undefined, 'deveria rolar acerto');
    afirmar((e.acertou && e.efeitoAplicado) || (!e.acertou && !e.efeitoAplicado), 'efeito só se acertar');
    if (e.acertou) acertos += 1;
  }
  afirmar(Math.abs(acertos / M - 0.3) <= 0.03, `taxa ${acertos / M}`);
  return `${(acertos / M * 100).toFixed(1)}%`;
});

teste('Fraqueza: −2 no dano dos golpes do alvo, não acumula', () => {
  const a = montarCartaSintetica({ agilidade: 1, vida: 1000, defesa: 0, golpes: [{ nome: 'Fraqueza', dado: null, atributo: null, efeito: 'fraqueza' }] });
  const b = montarCartaSintetica({ agilidade: 0, vida: 1000, forca: 2, golpes: [{ dado: 'd6', atributo: 'forca' }] });
  const danos = [];
  for (let seed = 1; seed <= 20; seed += 1) {
    const r = batalha(a, b, { seed, maxTurnos: 100 });
    ataques(r.log, 'b').forEach((e) => danos.push(e.dano));
  }
  afirmar(Math.min(...danos) === 1 && Math.max(...danos) === 6, `${Math.min(...danos)}..${Math.max(...danos)} (esperado 1..6 = d6+2−2)`);
  const c = montarCartaSintetica({ forca: 0 });
  c.tokens.fraqueza = true;
  afirmar(aplicarEfeito(c, 'fraqueza', criarRng(1)).jaTinha === true, 'não acumula');
  const rng = criarRng(24);
  const alvo = montarCartaSintetica({ agilidade: 0 });
  for (let i = 0; i < 500; i += 1) {
    const r = resolverAtaque(c, alvo, montarCartaSintetica({ golpes: [{ dado: 'd4' }] }).golpes[0], rng);
    afirmar(r.dano >= 0 && r.dano <= 2, `d4 com fraqueza: ${r.dano}`);
  }
  return 'ok';
});

teste('Veneno: alvo perde 1 coração no fim de cada turno dele; não acumula', () => {
  const a = parede({ agilidade: 1, golpes: [{ nome: 'Veneno', dado: null, atributo: null, efeito: 'veneno' }] });
  const b = montarCartaSintetica({ agilidade: 0, vida: 3, golpes: [{ dado: 'd4' }] });
  const r = batalha(a, b, { seed: 3 });
  afirmar(r.vencedor === 'a' && r.motivo === 'KO', `vencedor ${r.vencedor}`);
  const ticks = r.log.filter((e) => e.tipo === 'veneno');
  afirmar(ticks.length === 3 && ticks.every((e) => e.lado === 'b'), `${ticks.length} ticks`);
  afirmar(ticks.map((e) => e.vidaApos).join() === '2,1,0', 'vida 2,1,0 (1 por turno, sem acumular mesmo reaplicando)');
  afirmar(r.turnos === 6, `turnos ${r.turnos}`);
  return 'ok';
});

teste('Paralisia: no turno do alvo, d10 de 1 a 4 não ataca (~40%)', () => {
  const a = parede({ agilidade: 1, vida: 1000, golpes: [{ nome: 'Paralisia', dado: null, atributo: null, efeito: 'paralisia' }] });
  const b = montarCartaSintetica({ agilidade: 0, vida: 1000, golpes: [{ dado: 'd4' }] });
  let parados = 0;
  let atacou = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const r = batalha(a, b, { seed, maxTurnos: 400 });
    parados += r.log.filter((e) => e.tipo === 'paralisia').length;
    atacou += ataques(r.log, 'b').length;
  }
  const taxa = parados / (parados + atacou);
  afirmar(Math.abs(taxa - 0.4) <= 0.04, `taxa ${taxa}`);
  return `${(taxa * 100).toFixed(1)}% sem atacar`;
});

teste('Sono: alvo perde o próximo turno e o token sai', () => {
  const a = montarCartaSintetica({
    agilidade: 1, vida: 1000, defesa: 99,
    golpes: [{ nome: 'Ataque', dado: 'd4' }, { nome: 'Sono', dado: null, atributo: null, efeito: 'sono', cargas: 1 }],
  });
  const b = montarCartaSintetica({ agilidade: 0, vida: 1000, golpes: [{ dado: 'd4' }] });
  const r = batalha(a, b, { seed: 4, maxTurnos: 6, politica: prefere('Sono', 'Ataque') });
  const seq = r.log.filter((e) => e.turno).map((e) => `${e.lado}:${e.tipo || e.golpe}`);
  afirmar(seq.join(' ') === 'a:Sono b:sono a:Ataque b:Golpe 1 a:Ataque b:Golpe 1', seq.join(' '));
  return seq.slice(0, 4).join(' ');
});

teste('Ligeiro: +3 de Agilidade (teto 8) reduz o acerto do inimigo', () => {
  const a = montarCartaSintetica({ agilidade: 6, vida: 1000, defesa: 99, golpes: [{ nome: 'Ligeiro', dado: null, atributo: null, efeito: 'ligeiro' }] });
  const b = montarCartaSintetica({ agilidade: 0, vida: 1000, golpes: [{ dado: 'd4' }] });
  let acertos = 0;
  let total = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const r = batalha(a, b, { seed, maxTurnos: 400 });
    ataques(r.log, 'b').forEach((e) => { total += 1; if (e.acertou) acertos += 1; });
  }
  afirmar(Math.abs(acertos / total - 0.3) <= 0.03, `taxa ${acertos / total}`);
  return `${(acertos / total * 100).toFixed(1)}%`;
});

teste('Escudo: próximo golpe recebido faz 0 e o token sai; o seguinte causa dano', () => {
  const a = montarCartaSintetica({
    agilidade: 1, vida: 100,
    golpes: [{ nome: 'Ataque', dado: 'd4' }, { nome: 'Escudo', dado: null, atributo: null, efeito: 'escudo', cargas: 1 }],
  });
  const b = montarCartaSintetica({ agilidade: 0, vida: 100, forca: 5, golpes: [{ dado: 'd6', atributo: 'forca' }] });
  const r = batalha(a, b, { seed: 8, maxTurnos: 4, politica: prefere('Escudo', 'Ataque') });
  const dosB = ataques(r.log, 'b');
  afirmar(dosB[0].acertou && dosB[0].dano === 0 && dosB[0].escudo === true, 'primeiro golpe de B deveria fazer 0 (escudo)');
  afirmar(dosB[1].dano >= 6 && !dosB[1].escudo, `segundo golpe de B: dano ${dosB[1].dano}`);
  afirmar(r.vidaRestante.a === 100 - dosB[1].dano, 'vida de A');
  return 'ok';
});

teste('Escudo contra golpe que erra: token não é consumido', () => {
  const a = montarCartaSintetica({ agilidade: 8 });
  a.tokens.escudo = true;
  const b = atacante(5);
  const rng = criarRng(25);
  for (let i = 0; i < 2000; i += 1) {
    const r = resolverAtaque(b, a, b.golpes[0], rng);
    afirmar(r.acertou || !r.escudo, 'erro não deveria marcar escudo');
  }
  return 'ok';
});

teste('Força Extra: +2 no dano dos próprios golpes', () => {
  const rng = criarRng(26);
  const a = atacante(0);
  a.tokens.forca_extra = true;
  const alvo = montarCartaSintetica({ agilidade: 0 });
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolverAtaque(a, alvo, a.golpes[0], rng);
    min = Math.min(min, r.dano);
    max = Math.max(max, r.dano);
  }
  afirmar(min === 3 && max === 8, `${min}..${max} (d6+2)`);
  // Pela batalha: golpe de suporte aplica o token em si.
  const s = montarCartaSintetica({ agilidade: 1, vida: 1000, golpes: [{ nome: 'Fúria', dado: null, atributo: null, efeito: 'forca_extra', cargas: 1 }, { nome: 'Ataque', dado: 'd4', atributo: 'forca' }] });
  const r = batalha(s, parede({ vida: 1000, defesa: 0, agilidade: 0 }), { seed: 2, maxTurnos: 4, politica: prefere('Fúria', 'Ataque') });
  const e = ataques(r.log, 'a')[1];
  afirmar(e.dano >= 3 && e.dano <= 6, `depois da Fúria: d4+2 = 3..6, veio ${e.dano}`);
  return 'ok';
});

teste('Cura: recupera 1d6 corações, nunca passa da vida máxima', () => {
  const rng = criarRng(27);
  const c = montarCartaSintetica({ vida: 10 });
  const vistos = new Set();
  for (let i = 0; i < 2000; i += 1) {
    c.vidaAtual = 9; // falta 1: sempre capa em 10
    const r = aplicarEfeito(c, 'cura', rng);
    afirmar(c.vidaAtual === 10 && r.curou === 1, `vida ${c.vidaAtual}`);
    c.vidaAtual = 2;
    const r2 = aplicarEfeito(c, 'cura', rng);
    vistos.add(r2.rolagem);
    afirmar(c.vidaAtual === 2 + r2.rolagem && r2.curou === r2.rolagem, 'cura de 1d6 inteira');
  }
  afirmar(vistos.size === 6 && Math.min(...vistos) === 1 && Math.max(...vistos) === 6, 'faces 1..6');
  c.vidaAtual = 10;
  afirmar(aplicarEfeito(c, 'cura', rng).curou === 0 && c.vidaAtual === 10, 'cheio: nada');
  // Em batalha: nunca acima do máximo.
  const a = montarCartaSintetica({ agilidade: 0, vida: 6, golpes: [{ nome: 'Cura', dado: null, atributo: null, efeito: 'cura' }] });
  const b = montarCartaSintetica({ agilidade: 0, vida: 1000, golpes: [{ dado: 'd4', atributo: 'forca' }] });
  let curas = 0;
  for (let seed = 1; seed <= 50; seed += 1) {
    const r = batalha(a, b, { seed, maxTurnos: 40 });
    r.log.filter((e) => e.efeitoAplicado && e.efeitoAplicado.efeito === 'cura').forEach((e) => {
      curas += 1;
      afirmar(e.efeitoAplicado.curou <= e.efeitoAplicado.rolagem, 'curou mais que a rolagem');
    });
    afirmar(r.vidaRestante.a <= 6, `vida ${r.vidaRestante.a} acima do máximo`);
  }
  afirmar(curas > 0, 'nenhuma cura registrada');
  return `${curas} curas`;
});

teste('Efeitos não acumulam: token já presente é no-op', () => {
  const c = montarCartaSintetica({});
  for (const ef of ['fraqueza', 'veneno', 'paralisia', 'sono', 'ligeiro', 'escudo', 'forca_extra']) {
    afirmar(aplicarEfeito(c, ef, criarRng(1)).jaTinha === false, `${ef} 1ª vez`);
    afirmar(aplicarEfeito(c, ef, criarRng(1)).jaTinha === true, `${ef} 2ª vez`);
    afirmar(c.tokens[ef] === true, `${ef} é token booleano`);
  }
  return 'ok';
});

teste('Tokens saem no fim da luta (cada batalha começa limpa)', () => {
  const a = montarCartaSintetica({ agilidade: 1, golpes: [{ nome: 'Escudo', dado: null, atributo: null, efeito: 'escudo' }] });
  batalha(a, parede(), { seed: 1, maxTurnos: 3 });
  afirmar(Object.keys(a.tokens).length === 0, 'carta original não deve ganhar tokens');
  const r1 = batalha(a, parede(), { seed: 1, maxTurnos: 3 });
  afirmar(r1.log.find((e) => e.golpe === 'Escudo').efeitoAplicado.jaTinha === false, 'nova luta, token novo');
  return 'ok';
});

teste('Área em 1 contra 1 se comporta como golpe normal', () => {
  const mk = (area) => montarCartaSintetica({ forca: 2, golpes: [{ dado: 'd8', area, elemento: 'fogo', atributo: 'forca' }] });
  const alvo = montarCartaSintetica({ vida: 12, agilidade: 3, defesa: 1 });
  for (let seed = 1; seed <= 50; seed += 1) {
    const x = batalha(mk(true), alvo, { seed });
    const y = batalha(mk(false), alvo, { seed });
    afirmar(JSON.stringify(x) === JSON.stringify(y), `seed ${seed} diferente`);
  }
  return '50 seeds idênticas';
});

teste('Iniciativa: maior Agilidade começa; empate sorteado (~50%)', () => {
  const rapido = montarCartaSintetica({ agilidade: 4 });
  const lento = montarCartaSintetica({ agilidade: 2 });
  afirmar(batalha(rapido, lento, { seed: 1 }).log[0].primeiro === 'a', 'a mais rápido');
  afirmar(batalha(lento, rapido, { seed: 1 }).log[0].primeiro === 'b', 'b mais rápido');
  let a = 0;
  for (let seed = 1; seed <= 2000; seed += 1) if (batalha(rapido, rapido, { seed }).log[0].primeiro === 'a') a += 1;
  afirmar(Math.abs(a / 2000 - 0.5) <= 0.05, `empate: ${a / 2000}`);
  return 'ok';
});

teste('Política padrão: suporte quando o efeito vale mais que o melhor ataque; não repete efeito ativo', () => {
  const a = montarCartaSintetica({ vida: 20, golpes: [{ nome: 'Ataque', dado: 'd4' }, { nome: 'Sono', dado: null, atributo: null, efeito: 'sono', cargas: 2 }] });
  const b = montarCartaSintetica({ vida: 20, agilidade: 0, forca: 5, golpes: [{ dado: 'd12' }] });
  afirmar(padrao.escolher(a, b, a.golpes) === 1, 'deveria usar Sono no primeiro turno');
  b.tokens.sono = true;
  afirmar(padrao.escolher(a, b, a.golpes) === 0, 'Sono já aplicado: ataca');
  // Contra um alvo fraco o ataque compensa mais que o efeito.
  const fraco = montarCartaSintetica({ vida: 20, agilidade: 0, golpes: [{ dado: 'd4' }] });
  const forte = montarCartaSintetica({ vida: 20, forca: 6, golpes: [{ nome: 'Ataque', dado: 'd8' }, { nome: 'Sono', dado: null, atributo: null, efeito: 'sono' }] });
  afirmar(padrao.escolher(forte, fraco, forte.golpes) === 0, 'ataque forte contra alvo fraco');
  // Escudo já ativo não é repetido; Cura só com vida faltando.
  const c = montarCartaSintetica({ vida: 20, golpes: [{ nome: 'Ataque', dado: 'd4' }, { nome: 'Escudo', dado: null, atributo: null, efeito: 'escudo' }, { nome: 'Cura', dado: null, atributo: null, efeito: 'cura' }] });
  const forteB = montarCartaSintetica({ vida: 30, forca: 5, agilidade: 0, golpes: [{ dado: 'd12' }] });
  c.tokens.escudo = true;
  afirmar(padrao.escolher(c, forteB, c.golpes) === 0, 'vida cheia e escudo ativo: ataca');
  c.vidaAtual = 3;
  afirmar(padrao.escolher(c, forteB, c.golpes) === 2, 'vida baixa: cura');
  return 'ok';
});

teste('Política aleatória: determinística por semente e usa golpes de suporte', () => {
  const novo = FIXTURES.find((e) => e.nome === 'Novo');
  const a = montarCarta(novo, { progresso: 70 });
  const b = montarCarta(FIXTURES.find((e) => e.nome === 'Legado'), { progresso: 70 });
  const x = batalha(a, b, { seed: 7, politica: aleatoria });
  const y = batalha(a, b, { seed: 7, politica: aleatoria });
  afirmar(JSON.stringify(x) === JSON.stringify(y), 'não determinística');
  const usouSuporte = Array.from({ length: 50 }, (_, s) => batalha(a, b, { seed: s, politica: aleatoria }).log)
    .some((l) => l.some((e) => e.golpe === 'Pó do Sono' || e.golpe === 'Descanso'));
  afirmar(usouSuporte, 'nunca escolheu suporte');
  return 'ok';
});

teste('Fixtures: todas as combinações de cartas rodam nas duas políticas', () => {
  let batalhas = 0;
  for (const ea of FIXTURES) {
    for (const eb of FIXTURES) {
      for (const pol of [padrao, aleatoria]) {
        for (const prog of [0, 12, 70]) {
          const r = batalha(montarCarta(ea, { progresso: prog }), montarCarta(eb, { progresso: prog }), { seed: 3, politica: pol });
          afirmar(['KO', 'limite'].includes(r.motivo), 'motivo');
          batalhas += 1;
        }
      }
    }
  }
  return `${batalhas} batalhas`;
});

teste('Cenário: todas as cartas montam e lutam (formato novo ou antigo)', () => {
  const novos = DADOS_PADRAO.filter((e) => e.golpes.every((g) => g.elemento !== undefined)).length;
  let n = 0;
  DADOS_PADRAO.forEach((e, i) => {
    const outro = DADOS_PADRAO[(i + 1) % DADOS_PADRAO.length];
    const ca = montarCarta(e, { progresso: 70 });
    const cb = montarCarta(outro, { progresso: 70 });
    afirmar(ca.golpes[0].cargas === null, `${e.nome}: golpe 1 deveria ser ilimitado`);
    afirmar(ca.vidaMax <= 16, `${e.nome}: vida ${ca.vidaMax}`);
    for (const pol of [padrao, aleatoria]) {
      const r = batalha(ca, cb, { seed: 11, politica: pol, log: false });
      afirmar(r.turnos > 0, 'turnos');
      n += 1;
    }
  });
  return `${n} batalhas; ${novos}/${DADOS_PADRAO.length} espécies já com formato novo`;
});

console.log('');
console.log(falhas === 0 ? 'Todos os testes passaram.' : `${falhas} teste(s) falharam.`);
if (falhas > 0) process.exitCode = 1;
