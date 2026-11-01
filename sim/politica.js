'use strict';

// Políticas de escolha de golpe (usadas pelo motor) e de distribuição de estrelas (usadas pelo carta.js).

const {
  EFEITOS_NEGATIVOS,
  atributoDoGolpe,
  agilidadeEfetiva,
  ajusteTokens,
  calcularDano,
  efeitoDeTipo,
  probAcerto,
  tem,
} = require('./motor');

// Dano médio esperado de um golpe com dado contra o alvo atual: P(acerto) x média do dano com acerto.
// Calculado exatamente, percorrendo todas as faces do dado. Considera tokens (Força Extra, Fraqueza,
// Ligeiro do alvo, Escudo do alvo). Golpe de suporte (sem dado): 0.
function danoMedioEsperado(atacante, defensor, golpe) {
  if (!golpe.dado) return 0;
  const p = probAcerto(agilidadeEfetiva(defensor));
  if (p === 0) return 0;
  if (tem(defensor, 'escudo')) return 0;
  const atributo = atacante.atributos[atributoDoGolpe(golpe)].valor;
  const efeito = efeitoDeTipo(defensor, golpe.elemento);
  const defesa = defensor.atributos.defesa.valor;
  const bonus = (golpe.bonus || 0) + ajusteTokens(atacante);
  let soma = 0;
  for (let face = 1; face <= golpe.lados; face += 1) {
    soma += calcularDano({ dado: face, bonus, atributo, efeito, defesa });
  }
  return (p * soma) / golpe.lados;
}

const HORIZONTE_MAX = 3; // turnos futuros que um efeito é contado

// Melhor dano esperado por turno de `quem` contra `contra`, entre os golpes liberados com cargas.
function melhorDanoEsperado(quem, contra) {
  let melhor = 0;
  for (const g of quem.golpes) {
    if (!g.liberado || (g.cargas !== null && g.cargasRestantes <= 0)) continue;
    melhor = Math.max(melhor, danoMedioEsperado(quem, contra, g));
  }
  return melhor;
}

// Valor esperado, em corações, do efeito de um golpe. 0 se o token já está aplicado.
// Heurística simples: o efeito vale por no máximo 3 turnos (menos se o alvo morre antes);
// o ganho é medido em dano evitado ou causado por turno.
//   fraqueza    2 x P(alvo me acerta) por turno (o ajuste de -2 vale por golpe do alvo)
//   veneno      1 por turno
//   paralisia   40% x melhor dano esperado do alvo
//   sono        melhor dano esperado do alvo (1 turno só)
//   ligeiro     reduz a chance do alvo me acertar em 30 pontos (3 de Agilidade): 0,3 x dano do alvo
//   escudo      melhor dano esperado do alvo (anula 1 golpe)
//   forca_extra +2 x P(acerto) por turno
//   cura        média de 1d6 limitada aos corações que faltam
// Efeito negativo só vale se o golpe acertar: multiplica pela P(acerto) quando o golpe não tem dado
// (com dado, o acerto já entra no dano esperado e o efeito segue o mesmo acerto).
function valorDoEfeito(atacante, defensor, golpe, horizonte) {
  const efeito = golpe.efeito;
  if (!efeito) return 0;
  const pAcerto = probAcerto(agilidadeEfetiva(defensor));
  const dano = melhorDanoEsperado(defensor, atacante);
  const ehNegativo = EFEITOS_NEGATIVOS.includes(efeito);
  if (efeito === 'cura') {
    const falta = atacante.vidaMax - atacante.vidaAtual;
    // Média de min(1d6, falta)
    let soma = 0;
    for (let f = 1; f <= 6; f += 1) soma += Math.min(f, falta);
    return soma / 6;
  }
  if (tem(ehNegativo ? defensor : atacante, efeito)) return 0;
  let valor = 0;
  if (efeito === 'fraqueza') valor = 2 * probAcerto(agilidadeEfetiva(atacante)) * horizonte;
  else if (efeito === 'veneno') valor = 1 * horizonte;
  else if (efeito === 'paralisia') valor = 0.4 * dano * horizonte;
  else if (efeito === 'sono') valor = dano;
  else if (efeito === 'ligeiro') {
    const ganho = agilidadeEfetiva(atacante) >= 8 ? 0 : 0.3;
    valor = ganho * dano * horizonte;
  } else if (efeito === 'escudo') valor = dano;
  else if (efeito === 'forca_extra') valor = 2 * pAcerto * horizonte;
  return ehNegativo && !golpe.dado ? valor * pAcerto : valor;
}

// Padrão: golpe com maior valor esperado = dano esperado + valor do efeito (ver valorDoEfeito).
// Efeito já aplicado vale 0, então a política só usa um golpe de suporte quando o efeito ainda não está ativo
// e rende mais que o melhor ataque (ex.: Sono ou Escudo no primeiro turno contra atacante forte).
// Empate: o primeiro da lista. Sem sorteio, portanto determinística.
const padrao = {
  nome: 'padrao',
  escolher(atacante, defensor, disponiveis) {
    const melhorDano = Math.max(1, ...disponiveis.map((g) => danoMedioEsperado(atacante, defensor, g)));
    const horizonte = Math.min(HORIZONTE_MAX, Math.max(1, Math.ceil(defensor.vidaAtual / melhorDano)));
    let melhor = 0;
    let melhorValor = -1;
    disponiveis.forEach((g, i) => {
      const v = danoMedioEsperado(atacante, defensor, g) + valorDoEfeito(atacante, defensor, g, horizonte);
      if (v > melhorValor) {
        melhorValor = v;
        melhor = i;
      }
    });
    return melhor;
  },
};

// Alternativa: escolhe um golpe disponível ao acaso (usa o rng da batalha).
const aleatoria = {
  nome: 'aleatoria',
  escolher(atacante, defensor, disponiveis, rng) {
    return Math.floor(rng() * disponiveis.length);
  },
};

const POLITICAS_GOLPE = { padrao, aleatoria };

// Estrelas: ordem de preenchimento em grupos. Dentro de um grupo, distribui de forma cíclica
// (uma estrela por vez) até encher. O grupo seguinte só recebe quando o anterior está cheio.
const POLITICAS_ESTRELAS = {
  igual: [['forca', 'energia', 'agilidade', 'defesa']],
  forca: [['forca', 'energia'], ['agilidade', 'defesa']],
  agilidade: [['agilidade'], ['forca', 'energia', 'defesa']],
};

function listarPoliticasEstrelas() {
  return Object.keys(POLITICAS_ESTRELAS);
}

function obterPoliticaGolpe(nome) {
  const p = POLITICAS_GOLPE[nome];
  if (!p) throw new Error(`Política de golpe desconhecida: "${nome}". Use: ${Object.keys(POLITICAS_GOLPE).join(', ')}.`);
  return p;
}

// Distribui `n` estrelas entre os atributos, respeitando a capacidade (slots) de cada um.
function distribuirEstrelas(n, capacidade, politica) {
  const grupos = POLITICAS_ESTRELAS[politica];
  if (!grupos) throw new Error(`Política de estrelas desconhecida: "${politica}". Use: ${listarPoliticasEstrelas().join(', ')}.`);
  const alocado = { forca: 0, energia: 0, agilidade: 0, defesa: 0 };
  let restante = n;
  for (const grupo of grupos) {
    let andou = true;
    while (restante > 0 && andou) {
      andou = false;
      for (const attr of grupo) {
        if (restante > 0 && alocado[attr] < capacidade[attr]) {
          alocado[attr] += 1;
          restante -= 1;
          andou = true;
        }
      }
    }
  }
  return alocado;
}

module.exports = {
  padrao,
  aleatoria,
  danoMedioEsperado,
  valorDoEfeito,
  obterPoliticaGolpe,
  distribuirEstrelas,
  listarPoliticasEstrelas,
};
