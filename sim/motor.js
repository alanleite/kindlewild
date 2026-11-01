'use strict';

// Motor de combate 1 contra 1 (regras da docs/especificacao.md, seção 6).
// Não modela crítico, captura, fuga, descanso nem troca de criatura. Ver sim/README.md.

const SEMENTE_PADRAO = 12345;

const TETO_AGILIDADE = 8;
const TETO_VIDA = 16;
const LIMITE_PARALISIA = 4; // d10 de 1 a 4: não ataca
const EFEITOS_NEGATIVOS = ['fraqueza', 'veneno', 'paralisia', 'sono'];
const EFEITOS_POSITIVOS = ['ligeiro', 'escudo', 'forca_extra', 'cura'];
// Efeitos que ficam como token na carta (cura é instantânea).
const EFEITOS_TOKEN = ['fraqueza', 'veneno', 'paralisia', 'sono', 'ligeiro', 'escudo', 'forca_extra'];

// Gerador determinístico (mulberry32). Mesma semente, mesma sequência.
function criarRng(semente = SEMENTE_PADRAO) {
  let a = semente >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rola um dado de `lados` faces: inteiro de 1 a `lados`.
function rolar(lados, rng) {
  return Math.floor(rng() * lados) + 1;
}

// Chance de acerto contra a Agilidade do alvo: P(d10 >= Agilidade).
// Agilidade 0 ou 1 acerta sempre. Agilidade acima de 10 nunca acerta.
function probAcerto(agilidade) {
  const ag = Math.max(0, agilidade);
  if (ag <= 1) return 1;
  if (ag > 10) return 0;
  return (11 - ag) / 10;
}

// Efeito de tipo que o alvo aplica ao elemento do golpe: 'vulneravel' | 'resistente' | 'imune' | 'neutro'.
function efeitoDeTipo(alvo, elemento) {
  const mapa = alvo.resistencias || {};
  return mapa[elemento] || 'neutro';
}

function tem(carta, efeito) {
  return Boolean(carta.tokens && carta.tokens[efeito]);
}

// Agilidade efetiva: base (+3 com Ligeiro), com teto 8.
function agilidadeEfetiva(carta) {
  const base = carta.atributos.agilidade.valor + (tem(carta, 'ligeiro') ? 3 : 0);
  return Math.min(TETO_AGILIDADE, base);
}

// Ajuste de dano dos tokens do atacante: Força Extra +2, Fraqueza −2 (somam-se se os dois estiverem presentes).
function ajusteTokens(carta) {
  return (tem(carta, 'forca_extra') ? 2 : 0) - (tem(carta, 'fraqueza') ? 2 : 0);
}

// Dano final (seção 6, passos 2 a 4).
// Imune zera antes de qualquer outra coisa. `bonus` entra no subtotal (Poder, Força Extra, Fraqueza),
// antes do efeito de tipo. Depois da Defesa: negativo vira 0, zero vira 1.
function calcularDano({ dado, bonus = 0, atributo, efeito = 'neutro', defesa }) {
  if (efeito === 'imune') return 0;
  const subtotal = dado + bonus + atributo;
  let aplicado = subtotal;
  if (efeito === 'vulneravel') aplicado = subtotal * 2;
  else if (efeito === 'resistente') aplicado = Math.ceil(subtotal / 2);
  const liquido = aplicado - defesa;
  if (liquido < 0) return 0;
  if (liquido === 0) return 1;
  return liquido;
}

function atributoDoGolpe(golpe) {
  return golpe.atributo || 'forca';
}

// Uma ação de ataque de golpe com dado: acerto (d10 contra a Agilidade efetiva do alvo), depois dano.
// Não altera a vida nem os tokens: quem aplica as consequências é `batalha`.
// Escudo no alvo: o acerto acontece, o dano vira 0 e `escudo: true` avisa que o token deve sair.
function resolverAtaque(atacante, defensor, golpe, rng) {
  const rolagemAcerto = rolar(10, rng);
  const agilidade = agilidadeEfetiva(defensor);
  if (rolagemAcerto < agilidade) {
    return { acertou: false, rolagemAcerto, dano: 0 };
  }
  const dado = rolar(golpe.lados, rng);
  const bonus = (golpe.bonus || 0) + ajusteTokens(atacante);
  const atributo = atacante.atributos[atributoDoGolpe(golpe)].valor;
  const efeito = efeitoDeTipo(defensor, golpe.elemento);
  const defesa = defensor.atributos.defesa.valor;
  if (tem(defensor, 'escudo')) {
    return { acertou: true, rolagemAcerto, dado, bonus, atributo, efeito, defesa, dano: 0, escudo: true };
  }
  const dano = calcularDano({ dado, bonus, atributo, efeito, defesa });
  return { acertou: true, rolagemAcerto, dado, bonus, atributo, efeito, defesa, dano };
}

function golpesDisponiveis(carta) {
  const indices = [];
  carta.golpes.forEach((g, i) => {
    if (g.liberado && (g.cargas === null || g.cargasRestantes > 0)) indices.push(i);
  });
  return indices;
}

// Cópia independente do estado de batalha (vida, cargas e tokens restaurados).
function cloneCarta(carta) {
  const c = JSON.parse(JSON.stringify(carta));
  c.vidaAtual = c.vidaMax;
  c.tokens = {};
  c.golpes.forEach((g) => {
    g.cargasRestantes = g.cargas;
  });
  return c;
}

// Aplica um efeito positivo em `carta` (token ou cura instantânea). Devolve o que aconteceu.
function aplicarEfeito(carta, efeito, rng) {
  if (efeito === 'cura') {
    const rolagem = rolar(6, rng);
    const antes = carta.vidaAtual;
    carta.vidaAtual = Math.min(carta.vidaMax, carta.vidaAtual + rolagem);
    return { efeito, rolagem, curou: carta.vidaAtual - antes };
  }
  const jaTinha = tem(carta, efeito);
  carta.tokens[efeito] = true;
  return { efeito, jaTinha };
}

// batalha(a, b, opcoes) -> { vencedor: 'a'|'b'|null, motivo, turnos, vidaRestante, log }
// Opções:
//   seed        semente (padrão 12345), usada se rng não for passado
//   rng         função que devolve número em [0, 1)
//   politica    objeto de sim/politica.js (padrão: politica.padrao)
//   maxTurnos   limite de ações (padrão 1000). Ao atingir, motivo = 'limite' e vencedor = null
//   log         false para não montar o registro de eventos (usado em lotes)
// Cada turno (ação de ataque, turno perdido ou turno sem golpe) conta como um. Quem age primeiro é quem tem
// maior Agilidade. Ordem dentro do turno de um lado: Sono (perde o turno, token sai) -> Paralisia (d10 1 a 4,
// não ataca) -> escolha e uso do golpe -> Veneno (perde 1 coração no fim do turno, mesmo se o turno foi perdido).
function batalha(a, b, opcoes = {}) {
  const rng = opcoes.rng || criarRng(opcoes.seed !== undefined ? opcoes.seed : SEMENTE_PADRAO);
  const politica = opcoes.politica || require('./politica').padrao;
  const maxTurnos = opcoes.maxTurnos || 1000;
  const registrar = opcoes.log !== false;

  const cartas = { a: cloneCarta(a), b: cloneCarta(b) };
  const log = [];

  // Iniciativa: regra antiga, Agilidade base (ainda não há tokens no começo da luta).
  const agA = cartas.a.atributos.agilidade.valor;
  const agB = cartas.b.atributos.agilidade.valor;
  let atual;
  let sorteio = false;
  if (agA > agB) atual = 'a';
  else if (agB > agA) atual = 'b';
  else {
    atual = rng() < 0.5 ? 'a' : 'b';
    sorteio = true;
  }
  if (registrar) {
    log.push({ tipo: 'inicio', agilidade: { a: agA, b: agB }, primeiro: atual, sorteio });
  }

  let turno = 0;
  let vencedor = null;
  let motivo = 'limite';

  while (turno < maxTurnos) {
    turno += 1;
    const alvo = atual === 'a' ? 'b' : 'a';
    const atk = cartas[atual];
    const def = cartas[alvo];
    let perdeTurno = false;

    if (tem(atk, 'sono')) {
      delete atk.tokens.sono;
      perdeTurno = true;
      if (registrar) log.push({ turno, lado: atual, tipo: 'sono' });
    } else if (tem(atk, 'paralisia')) {
      const rolagem = rolar(10, rng);
      if (rolagem <= LIMITE_PARALISIA) {
        perdeTurno = true;
        if (registrar) log.push({ turno, lado: atual, tipo: 'paralisia', rolagem });
      }
    }

    if (!perdeTurno) {
      const disponiveis = golpesDisponiveis(atk);
      if (disponiveis.length === 0) {
        if (registrar) log.push({ turno, lado: atual, tipo: 'sem_golpe' });
      } else {
        const escolhido = politica.escolher(atk, def, disponiveis.map((i) => atk.golpes[i]), rng);
        const golpe = atk.golpes[disponiveis[escolhido]];
        if (golpe.cargas !== null) golpe.cargasRestantes -= 1;

        const negativo = EFEITOS_NEGATIVOS.includes(golpe.efeito);
        const evento = {
          turno,
          lado: atual,
          golpe: golpe.nome,
          elemento: golpe.elemento,
          atributoGolpe: golpe.atributo,
        };
        if (golpe.dado) {
          const r = resolverAtaque(atk, def, golpe, rng);
          Object.assign(evento, r);
          if (r.acertou) {
            def.vidaAtual = Math.max(0, def.vidaAtual - r.dano);
            if (r.escudo) delete def.tokens.escudo;
            if (negativo && def.vidaAtual > 0) evento.efeitoAplicado = aplicarEfeito(def, golpe.efeito, rng);
          }
        } else if (negativo) {
          // Suporte com efeito negativo: rola acerto contra o alvo.
          const rolagemAcerto = rolar(10, rng);
          const acertou = rolagemAcerto >= agilidadeEfetiva(def);
          Object.assign(evento, { acertou, rolagemAcerto, dano: 0 });
          if (acertou) evento.efeitoAplicado = aplicarEfeito(def, golpe.efeito, rng);
        }
        // Efeito positivo (suporte ou junto de dano): em si mesmo, ao usar o golpe, sem acerto.
        if (EFEITOS_POSITIVOS.includes(golpe.efeito)) evento.efeitoAplicado = aplicarEfeito(atk, golpe.efeito, rng);
        evento.vidaAlvoApos = def.vidaAtual;
        if (registrar) log.push(evento);

        if (def.vidaAtual <= 0) {
          vencedor = atual;
          motivo = 'KO';
          break;
        }
      }
    }

    // Veneno: no fim de cada turno do envenenado.
    if (tem(atk, 'veneno')) {
      atk.vidaAtual = Math.max(0, atk.vidaAtual - 1);
      if (registrar) log.push({ turno, lado: atual, tipo: 'veneno', vidaApos: atk.vidaAtual });
      if (atk.vidaAtual <= 0) {
        vencedor = alvo;
        motivo = 'KO';
        break;
      }
    }
    atual = alvo;
  }

  return {
    vencedor,
    motivo,
    turnos: turno,
    vidaRestante: { a: cartas.a.vidaAtual, b: cartas.b.vidaAtual },
    log,
  };
}

module.exports = {
  SEMENTE_PADRAO,
  TETO_AGILIDADE,
  TETO_VIDA,
  EFEITOS_NEGATIVOS,
  EFEITOS_POSITIVOS,
  EFEITOS_TOKEN,
  criarRng,
  rolar,
  probAcerto,
  efeitoDeTipo,
  tem,
  agilidadeEfetiva,
  ajusteTokens,
  atributoDoGolpe,
  calcularDano,
  resolverAtaque,
  aplicarEfeito,
  golpesDisponiveis,
  cloneCarta,
  batalha,
};
