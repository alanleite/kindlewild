'use strict';

// Monta a carta de combate a partir das criaturas do cenário (cenarios/<id>/criaturas.json), para um progresso (0 a 70) e uma política de estrelas.

const path = require('path');
const { distribuirEstrelas, listarPoliticasEstrelas } = require('./politica');

const cenario = require(path.join(__dirname, '..', 'lib', 'cenario'));

const DADOS_PADRAO = cenario.criaturas();

const ATRIBUTOS = ['forca', 'energia', 'agilidade', 'defesa'];
const LADOS = { d4: 4, d6: 6, d8: 8, d12: 12 };
const TETO_VIDA = 16;

// Converte um golpe (formato novo ou antigo) para o formato novo.
// Antigo: tipo -> elemento; categoria fisico/elemental -> atributo forca/energia; usos -> cargas.
function normalizarGolpe(g) {
  const antigo = g.categoria !== undefined || g.tipo !== undefined || g.usos !== undefined;
  const elemento = g.elemento !== undefined ? g.elemento : (g.tipo !== undefined ? g.tipo : 'normal');
  let atributo = g.atributo;
  if (atributo === undefined) {
    if (g.categoria === 'fisico') atributo = 'forca';
    else if (g.categoria === 'elemental') atributo = 'energia';
    else atributo = g.dado ? 'forca' : null;
  }
  let cargas = g.cargas !== undefined ? g.cargas : (g.usos !== undefined ? g.usos : null);
  if (cargas === undefined) cargas = null;
  const dado = g.dado === undefined ? null : g.dado;
  if (dado !== null && !LADOS[dado]) throw new Error(`Dado inválido no golpe "${g.nome}": ${dado}`);
  return {
    nome: g.nome,
    icone: g.icone,
    elemento,
    atributo,
    dado,
    lados: dado ? LADOS[dado] : null,
    cargas,
    efeito: g.efeito === undefined ? null : g.efeito,
    area: Boolean(g.area),
    liberado_em: g.liberado_em,
    formatoAntigo: antigo && g.elemento === undefined,
  };
}

function normalizar(texto) {
  return String(texto)
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Aceita nome (sem acento e caixa indiferente) ou número da criatura.
function buscarEspecie(ref, lista = DADOS_PADRAO) {
  const texto = String(ref).trim();
  if (/^\d+$/.test(texto)) {
    const achada = lista.find((e) => e.id === Number(texto));
    if (achada) return achada;
  }
  const chave = normalizar(texto);
  const achada = lista.find((e) => normalizar(e.nome) === chave);
  if (!achada) throw new Error(`Espécie não encontrada: "${ref}". Use o nome da carta ou o número da criatura (rodar.js --listar mostra todas).`);
  return achada;
}

function contar(especie, tipo, p) {
  return especie.trilho.filter((m) => m.tipo === tipo && m.pos <= p).length;
}

// Espécie que evolui para esta (a forma anterior da linha).
function encontrarAnterior(especie, lista) {
  return lista.find((e) => (e.evolucao || []).some((ev) => ev.para === especie.nome)) || null;
}

// Atributos no ponto `p` do trilho. Forma base: base da espécie. Forma evoluída (atributos null):
// copia o valor atual de cada atributo da forma anterior no momento da evolução (marca `evolucao`),
// sem +1. Slots das evoluídas vêm do número de marcas de estrela (4 × slots).
function atributosNoPonto(especie, p, politica, lista) {
  let base;
  let slots;
  if (especie.atributos) {
    base = {};
    slots = {};
    for (const a of ATRIBUTOS) {
      base[a] = Math.max(0, especie.atributos[a].base);
      slots[a] = especie.atributos[a].slots;
    }
  } else {
    const anterior = encontrarAnterior(especie, lista);
    if (!anterior) throw new Error(`${especie.nome}: sem atributos e sem forma anterior para herdar.`);
    const pEvo = anterior.evolucao.find((ev) => ev.para === especie.nome).pos;
    const valorAnterior = atributosNoPonto(anterior, pEvo, politica, lista);
    base = {};
    slots = {};
    // Slots de forma herdada = slots da forma-raiz da linha (mesma convenção do gerador de trilhas).
    let raiz = anterior;
    while (raiz && raiz.herda_atributos) raiz = encontrarAnterior(raiz, lista);
    if (!raiz || !raiz.atributos) throw new Error(`${especie.nome}: forma-raiz sem atributos gravados.`);
    for (const a of ATRIBUTOS) {
      base[a] = valorAnterior[a].valor;
      slots[a] = raiz.atributos[a].slots;
    }
  }

  const totalCapacidade = ATRIBUTOS.reduce((s, a) => s + slots[a], 0);
  const disponiveis = Math.min(contar(especie, 'estrela', p), totalCapacidade);
  const estrelas = distribuirEstrelas(disponiveis, slots, politica);
  const automatico = { forca: contar(especie, 'forca', p), energia: 0, agilidade: 0, defesa: 0 };

  const resultado = {};
  for (const a of ATRIBUTOS) {
    resultado[a] = {
      base: base[a],
      slots: slots[a],
      estrelas: estrelas[a],
      automatico: automatico[a],
      valor: Math.max(0, base[a] + estrelas[a] + automatico[a]),
    };
  }
  return resultado;
}

// montarCarta(especie, opcoes) -> carta de combate
// opcoes.progresso: 0 a 70 (padrão 70). Marcas com pos <= progresso já estão feitas.
// opcoes.estrelas: 'igual' | 'forca' | 'agilidade' (padrão 'igual')
// opcoes.lista: lista de espécies, para resolver evoluções (padrão: criaturas do cenário)
function montarCarta(especie, opcoes = {}) {
  const p = opcoes.progresso === undefined ? 70 : opcoes.progresso;
  if (!Number.isInteger(p) || p < 0 || p > 70) throw new Error(`Progresso inválido: ${p}. Use inteiro de 0 a 70.`);
  const politica = opcoes.estrelas || 'igual';
  if (!listarPoliticasEstrelas().includes(politica)) {
    throw new Error(`Política de estrelas desconhecida: "${politica}". Use: ${listarPoliticasEstrelas().join(', ')}.`);
  }
  const lista = opcoes.lista || DADOS_PADRAO;

  const atributos = atributosNoPonto(especie, p, politica, lista);
  const coracoes = contar(especie, 'coracao', p);
  const vidaMax = Math.min(TETO_VIDA, especie.vida + coracoes);

  const marcasHab = especie.trilho.filter((m) => m.tipo === 'habilidade').sort((x, y) => x.pos - y.pos);
  const golpes = especie.golpes.map((bruto, i) => {
    const g = normalizarGolpe(bruto);
    // Marca de habilidade: formato novo (detalhe = número do golpe 1..4), formato antigo (detalhe = nome),
    // senão a i-ésima marca em ordem de posição. Sem marca: liberado_em (posição, só no formato antigo).
    let marca = marcasHab.find((m) => m.detalhe === g.nome || m.detalhe === i + 1);
    if (!marca && !g.formatoAntigo) marca = marcasHab[i];
    const posLiberacao = marca ? marca.pos : (g.formatoAntigo ? g.liberado_em : 0);
    // O primeiro golpe já vem liberado (seção 4 da especificação).
    const liberado = i === 0 || posLiberacao <= p;
    const bonus = liberado && g.dado
      ? especie.trilho.filter((m) => m.tipo === 'poder' && (m.detalhe === g.nome || m.detalhe === i + 1) && m.pos <= p).length
      : 0;
    // Golpe 1 sempre ilimitado.
    const cargas = i === 0 ? null : g.cargas;
    return {
      nome: g.nome,
      icone: g.icone,
      elemento: g.elemento,
      atributo: g.atributo,
      dado: g.dado,
      lados: g.lados,
      cargas,
      cargasRestantes: cargas,
      efeito: g.efeito,
      area: g.area,
      liberado,
      bonus,
    };
  });

  return {
    id: especie.id,
    nome: especie.nome,
    progresso: p,
    politicaEstrelas: politica,
    tipos: especie.tipos,
    vidaMax,
    vidaAtual: vidaMax,
    atributos,
    golpes,
    tokens: {},
    resistencias: especie.resistencias || {},
    marcas: {
      coracoes,
      estrelasFeitas: ATRIBUTOS.reduce((s, a) => s + atributos[a].estrelas, 0),
      habilidadesLiberadas: golpes.filter((g) => g.liberado).length - 1,
      poderes: golpes.reduce((s, g) => s + g.bonus, 0),
    },
  };
}

// Carta sintética para testes do motor (sem JSON).
function montarCartaSintetica(opcoes = {}) {
  const attr = (valor) => ({ base: valor, slots: 0, estrelas: 0, automatico: 0, valor });
  const golpes = (opcoes.golpes || [{}]).map((bruto, i) => {
    // Padrão dos testes: d6 físico normal ilimitado. `dado: null` explícito cria golpe de suporte.
    const g = normalizarGolpe({
      nome: bruto.nome || `Golpe ${i + 1}`,
      icone: 'bolinha',
      ...bruto,
      dado: bruto.dado === undefined ? 'd6' : bruto.dado,
    });
    return {
      nome: g.nome,
      icone: g.icone,
      elemento: g.elemento,
      atributo: g.atributo,
      dado: g.dado,
      lados: g.lados,
      cargas: g.cargas,
      cargasRestantes: g.cargas,
      efeito: g.efeito,
      area: g.area,
      liberado: true,
      bonus: bruto.bonus || 0,
    };
  });
  const vidaMax = opcoes.vida === undefined ? 10 : opcoes.vida;
  return {
    id: 0,
    nome: opcoes.nome || 'Sintetico',
    progresso: 0,
    politicaEstrelas: 'nenhuma',
    tipos: opcoes.tipos || ['normal'],
    vidaMax,
    vidaAtual: vidaMax,
    atributos: {
      forca: attr(opcoes.forca || 0),
      energia: attr(opcoes.energia || 0),
      agilidade: attr(opcoes.agilidade || 0),
      defesa: attr(opcoes.defesa || 0),
    },
    golpes,
    tokens: {},
    resistencias: opcoes.resistencias || {},
    marcas: { coracoes: 0, estrelasFeitas: 0, habilidadesLiberadas: 0, poderes: 0 },
  };
}

module.exports = {
  DADOS_PADRAO,
  ATRIBUTOS,
  normalizar,
  normalizarGolpe,
  TETO_VIDA,
  buscarEspecie,
  montarCarta,
  montarCartaSintetica,
  listarPoliticasEstrelas,
};
