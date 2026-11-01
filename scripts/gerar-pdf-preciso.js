#!/usr/bin/env node
/* Gera os PDFs de impressão das cartas com desenho vetorial direto (PDFKit), sem navegador.

   Lê as criaturas do cenário (cenarios/<id>/criaturas.json; padrão em cenarios/padrao.txt ou
   KINDLEWILD_CENARIO). Saídas (em cenarios/<id>/impressao/):
     cartas-frente.pdf  uma folha A4 por grupo de 4 cartas, só frente
     cartas-verso.pdf   uma folha A4 por grupo, só verso (trilho), colunas espelhadas
     cartas-A4.pdf      frente e verso intercalados: folha 1 frente, folha 1 verso, folha 2 frente...

   Uso: node scripts/gerar-pdf-preciso.js [opções]   (ou: npm run gerar -- [opções])
   Opções:
     --margem <mm>        margem não imprimível da impressora em cada lado (padrão 4)
     --cortes on|off     marcas de corte (cantos e meios das bordas, fora da carta) (padrão on)
     --registro on|off   marcas de registro (cruzes na margem, usadas por validar-alinhamento.js) (padrão on)
     --espelhar on|off   espelha as colunas do verso (padrão on)
     --ids <lista>       filtro de espécies, ex.: 1-12 ou 1,4,25-30 (padrão: todas)
     --liberados <n>     golpes liberados na frente, de 1 a 4 (padrão 1)
     --fonte <arquivo>   fonte TrueType (padrão: Arial Bold do macOS, tem ♀ e ♂)
     --ajuda             mostra este texto

   Regra de espelhamento (impressão frente e verso, virando a folha pelo lado longo):
     carta da coluna 1 na frente -> coluna 2 no verso, e carta da coluna 2 -> coluna 1.
     Na grade 2 x 2: slots 0,1,2,3 da frente ficam nos slots 1,0,3,2 do verso.

   Geometria: a grade 2 x 2 de cartas A6 (105 x 148,5 mm) ocupa exatamente o A4 (210 x 297 mm).
   Para caber margem e marcas, a grade inteira é reduzida por um fator único s, centralizada:
     inset = margem + 3,2 mm (faixa das marcas, se cortes ou registro estiverem ligados)
     s = min((210 - 2 x inset) / 210, (297 - 2 x inset) / 297)
   Com margem 4 e marcas ligadas, s = 0,931 (cartas de ~97,7 x 138,3 mm). Para A6 exato use
   --margem 0 --cortes off --registro off (sem marcas e sem margem, a impressora corta as bordas).
   Toda coordenada do desenho está em mm; não há arredondamento para pixel.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');

const RAIZ = path.resolve(__dirname, '..');
const cenario = require(path.join(RAIZ, 'lib', 'cenario'));
const ARQ_DADOS = path.join(cenario.pasta(), 'criaturas.json');
const PASTA_SAIDA = path.join(cenario.pasta(), 'impressao');
const FONTE_PADRAO = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
let FONTE = FONTE_PADRAO; // definida em principal() a partir de --fonte

// Reaproveita as regras do site (só leitura): imagens ampliadas, espelho do verso, agrupamento, notação dos dados.
const SITE = path.join(RAIZ, 'site');
const EscalaImagens = require(path.join(SITE, 'escala-imagens.js'));
const SelecaoImpressao = require(path.join(SITE, 'selecao-impressao.js'));
const ApresentacaoCarta = require(path.join(SITE, 'apresentacao-carta.js'));

// Ícones: site/icones.js é um script de navegador que grava window.ICONES. Rodado num contexto isolado.
function carregarIcones() {
  const codigo = fs.readFileSync(path.join(SITE, 'icones.js'), 'utf8');
  const janela = {};
  vm.runInNewContext(codigo, { window: janela });
  return janela.ICONES;
}
const ICONES = carregarIcones();

// ---------------------------------------------------------------- constantes (mm, como no CSS)

const MM = 72 / 25.4;               // pontos por mm (PDF)
const A4 = { w: 210, h: 297 };
const CARTA = { w: 105, h: 148.5 };
const POR_FOLHA = 4;
const TRILHO = { colunas: 7, linhas: 10, tamanho: 70, quadrado: 10, espaco: 4 };
const TRILHO_ANTIGO = 50;           // formato antigo (docs/regras-geracao-trilhas.md, seção 10.1)
const VIDA_MAX = 16;
const GOLPES = 4;
const BANDA_MARCAS = 3.2;           // faixa fora da grade reservada às marcas
const ASC = 0.905, DESC = 0.212;    // ascender e descender da Arial Bold (por em), para centralizar texto
const CAP_ALTURA = 0.716;           // altura de maiúscula (não usada para centralizar; referência)

const TINTA = '#000000';
const FOLHA = '#ffffff';
const FILETE = '#9aa1ad';           // cor-linha-suave na impressão
const CORACAO = '#e0313a';
const TIPO_PADRAO = '#c4c4b4';
const TIPO_COR = {
  eletrico: '#f7c600', fogo: '#f0622a', agua: '#3b8ee6', planta: '#3ea650', terra: '#b98b52',
  gelo: '#7fd8ea', voador: '#9bb8ef', veneno: '#9a4fc4', psiquico: '#e95b9a', pedra: '#a9a17e',
  normal: '#c4c4b4', lutador: '#c8553d', inseto: '#9bc23c', fantasma: '#6f5ea8', dragao: '#5b4fd8'
};
const MARCA_COR = {
  habilidade: '#bfd9ff', estrela: '#ffe98a', coracao: '#ffc4c7',
  forca: '#ffd2b0', poder: '#dcc3f2', evolucao: '#bfe9c9'
};
const ORDEM_ATRIBUTOS = ['forca', 'energia', 'agilidade', 'defesa'];
const ATRIBUTO_DO_GOLPE = { fisico: 'forca', elemental: 'energia' };
const PRIORIDADE_EFEITO = { vulneravel: 0, imune: 1, resistente: 2 };
const MAX_CHIPS = 3;

// ---------------------------------------------------------------- utilidades

function inteiro(valor, minimo) {
  return Math.max(minimo, Math.floor(Number(valor) || 0));
}

function listaEvolucoes(p) {
  if (Array.isArray(p.evolucao)) return p.evolucao;
  return p.evolucao ? [p.evolucao] : [];
}

function corTipo(tipo) {
  return TIPO_COR[tipo] || TIPO_PADRAO;
}

function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbParaHex(rgb) {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

// Equivale a color-mix(in srgb, cor pct%, branco) do CSS.
function misturarComBranco(hex, pct) {
  const a = hexParaRgb(hex);
  return rgbParaHex(a.map(v => Math.round(v * pct + 255 * (1 - pct))));
}

// SVG do ícone com as cores da impressão. currentColor vira a cor de tinta; preenche troca o fill do
// elemento raiz (usado no coração); traco troca o stroke-width raiz (usado na marca de liberado).
function svgIcone(grupo, nome, opts) {
  const o = opts || {};
  let svg = ICONES.obter(grupo, nome);
  svg = svg.split('currentColor').join(o.cor || TINTA);
  if (o.preenche) svg = svg.replace(' fill="none"', ' fill="' + o.preenche + '"');
  if (o.traco) svg = svg.replace('stroke-width="1.8"', 'stroke-width="' + o.traco + '"');
  return svg;
}

function desenharIcone(doc, grupo, nome, x, y, lado, opts) {
  SVGtoPDF(doc, svgIcone(grupo, nome, opts), x, y, { width: lado, height: lado });
}

// Caixa com borda por dentro (como box-sizing: border-box do CSS). Traço centrado em bw/2.
function caixa(doc, x, y, w, h, r, o) {
  const bw = o.bw || 0;
  const i = bw / 2;
  doc.save();
  if (bw > 0 && o.borda) {
    doc.lineWidth(bw);
    doc.roundedRect(x + i, y + i, w - bw, h - bw, Math.max(0, r - i));
    if (o.fundo) doc.fillAndStroke(o.fundo, o.borda);
    else doc.stroke(o.borda);
  } else if (o.fundo) {
    doc.roundedRect(x, y, w, h, r).fill(o.fundo);
  }
  doc.restore();
}

// Círculo com borda por dentro. raio é o raio externo.
function circulo(doc, cx, cy, raio, o) {
  const bw = o.bw || 0;
  doc.save();
  if (bw > 0 && o.borda) {
    doc.lineWidth(bw);
    doc.circle(cx, cy, raio - bw / 2);
    if (o.fundo) doc.fillAndStroke(o.fundo, o.borda);
    else doc.stroke(o.borda);
  } else if (o.fundo) {
    doc.circle(cx, cy, raio).fill(o.fundo);
  }
  doc.restore();
}

// Texto com a linha de base em y (alphabetic). x é a borda esquerda.
function texto(doc, str, x, baseline, tamanho) {
  doc.font(FONTE).fontSize(tamanho).fillColor(TINTA);
  doc.text(str, x, baseline, { lineBreak: false, baseline: 'alphabetic' });
}

// Texto centralizado em cx e centrado verticalmente em cy (como flex center do CSS).
// maxLargura reduz o tamanho, de forma proporcional, se o texto não couber.
function textoCentrado(doc, str, cx, cy, tamanho, maxLargura) {
  let t = tamanho;
  doc.font(FONTE).fontSize(t);
  const w0 = doc.widthOfString(str);
  if (maxLargura && w0 > maxLargura) t = tamanho * maxLargura / w0;
  doc.font(FONTE).fontSize(t);
  const w = doc.widthOfString(str);
  const baseline = cy + ((ASC - DESC) / 2) * t;
  texto(doc, str, cx - w / 2, baseline, t);
}

// Quebra em até maxLinhas linhas dentro de largura (mm). Corta com reticências, como line-clamp.
function quebrarLinhas(doc, str, largura, maxLinhas) {
  const palavras = String(str).split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  palavras.forEach(function (p) {
    const teste = atual ? atual + ' ' + p : p;
    if (!atual || doc.widthOfString(teste) <= largura) atual = teste;
    else { linhas.push(atual); atual = p; }
  });
  if (atual) linhas.push(atual);
  if (linhas.length <= maxLinhas) return linhas;
  const cortadas = linhas.slice(0, maxLinhas);
  let ultima = cortadas[maxLinhas - 1];
  while (ultima.length && doc.widthOfString(ultima + '…') > largura) ultima = ultima.slice(0, -1);
  cortadas[maxLinhas - 1] = ultima.trimEnd() + '…';
  return cortadas;
}

// ---------------------------------------------------------------- dados

function calcularCadeia(especies) {
  const pai = {};
  especies.forEach(function (p) {
    listaEvolucoes(p).forEach(function (e) { if (e && e.para) pai[e.para] = p.nome; });
  });
  const estagios = {};
  function estagioDe(nome, guarda) {
    if (estagios[nome]) return estagios[nome];
    if (!pai[nome] || guarda > 5) return 1;
    return Math.min(3, estagioDe(pai[nome], guarda + 1) + 1);
  }
  especies.forEach(function (p) { estagios[p.nome] = estagioDe(p.nome, 0); });
  return { estagios: estagios, anteriores: pai };
}

// Forma evoluída (atributos null): slots pelo estágio (seção 5 da especificação).
function slotsDerivados(p, cadeia) {
  const temEvolucao = listaEvolucoes(p).length > 0;
  const temAnterior = !!cadeia.anteriores[p.nome];
  if (temAnterior) return temEvolucao ? 3 : 4;
  return temEvolucao ? 2 : 4;
}

function atributosDaForma(p, cadeia) {
  const saida = {};
  ORDEM_ATRIBUTOS.forEach(function (k) {
    const a = p.atributos && p.atributos[k] ? p.atributos[k] : null;
    if (a) saida[k] = { base: Math.max(0, Number(a.base) || 0), slots: inteiro(a.slots, 0), herdado: false };
    else saida[k] = { base: 0, slots: slotsDerivados(p, cadeia), herdado: true };
  });
  return saida;
}

function caminhoImagem(p) {
  if (!p.imagem) return null;
  return cenario.caminhoImagem(p);
}

// Avisos de dados. Não alteram o JSON. Nunca param a geração.
function verificarDados(especies) {
  const avisos = [];
  const antigos = especies.filter(function (p) {
    const pos = (p.trilho || []).map(function (m) { return Number(m.pos); });
    return pos.length && Math.max.apply(null, pos) <= TRILHO_ANTIGO;
  });
  if (antigos.length) {
    avisos.push('trilho no formato antigo (' + TRILHO_ANTIGO + ' quadradinhos) em ' + antigos.length +
      ' espécie(s): ' + antigos.slice(0, 5).map(function (p) { return p.nome; }).join(', ') +
      (antigos.length > 5 ? ' ...' : '') + '. A regra nova são ' + TRILHO.tamanho +
      ' (docs/regras-geracao-trilhas.md, seção 10.1). Gerando mesmo assim.');
  }
  especies.forEach(function (p) {
    const pos = (p.trilho || []).map(function (m) { return Number(m.pos); });
    if (pos.some(function (q) { return q > TRILHO.tamanho || q < 1; })) avisos.push(p.nome + ': marca fora de 1 a ' + TRILHO.tamanho + '.');
    if (new Set(pos).size !== pos.length) avisos.push(p.nome + ': posição repetida no trilho.');
    if ((p.golpes || []).length !== GOLPES) avisos.push(p.nome + ': ' + (p.golpes || []).length + ' golpes (esperado ' + GOLPES + ').');
    if (inteiro(p.vida, 0) > VIDA_MAX) avisos.push(p.nome + ': vida ' + p.vida + ' acima de ' + VIDA_MAX + ' (não cabe nas 2 linhas de corações).');
    (p.golpes || []).forEach(function (g) {
      if (!ApresentacaoCarta.rotuloDado(g.dado)) avisos.push(p.nome + ': golpe ' + g.nome + ' com dado ' + g.dado + ' (só d4, d6 e d8).');
    });
  });
  return avisos;
}

// ---------------------------------------------------------------- carta: base, frente e verso

function baseCarta(doc) {
  doc.save();
  doc.rect(0, 0, CARTA.w, CARTA.h).fill(FOLHA);
  // Filete neutro de corte (box-shadow inset de 0,35 mm no CSS). O topo da frente cobre o filete (ver desenharFrente).
  doc.rect(0.175, 0.175, CARTA.w - 0.35, CARTA.h - 0.35).lineWidth(0.35).stroke(FILETE);
  doc.restore();
}

function desenharFrente(doc, p, opts, cadeia) {
  doc.save();
  doc.rect(0, 0, CARTA.w, CARTA.h).clip();
  baseCarta(doc);

  const tipos = (p.tipos || []).filter(Boolean);
  const tipoPrincipal = tipos[0] || 'normal';
  const habLib = opts.liberados;

  // 1. Topo: 59,4 mm (40%). Fundo radial da cor do tipo principal, tom 35% para branco.
  const TOPO_H = 59.4;
  doc.save();
  doc.rect(0, 0, CARTA.w, TOPO_H).clip();
  doc.rect(0, 0, CARTA.w, TOPO_H).fill(FOLHA);
  const cx = 52.5, cy = TOPO_H * 0.58;
  const canto = Math.max.apply(null, [[0, 0], [CARTA.w, 0], [0, TOPO_H], [CARTA.w, TOPO_H]]
    .map(function (c) { return Math.hypot(c[0] - cx, c[1] - cy); }));
  const raio = canto * 0.72;
  const grad = doc.radialGradient(cx, cy, 0, cx, cy, raio);
  grad.stop(0, misturarComBranco(corTipo(tipoPrincipal), 0.35)).stop(1, FOLHA);
  doc.rect(0, 0, CARTA.w, TOPO_H).fill(grad);
  doc.restore();

  // Imagem: caixa de 97 x 46,9 mm em (4; 10,5). Artwork quadrado 475 px, contido na altura, escala da EscalaImagens.
  const f = EscalaImagens.obter(p);
  const lado = 46.9 * f;
  const imgCy = 10.5 + 46.9 / 2;
  const arq = caminhoImagem(p);
  if (arq && fs.existsSync(arq)) {
    doc.image(arq, cx - lado / 2, imgCy - lado / 2, { width: lado, height: lado });
  } else {
    doc.save();
    doc.lineWidth(0.5).dash(1.2, { space: 1.2 }).circle(cx, imgCy, 15).stroke(FILETE);
    doc.undash();
    doc.restore();
    console.warn('AVISO: imagem não encontrada para ' + p.nome + ': ' + p.imagem);
  }

  // Faixa do nome: 97 x 8 mm em (4; 2,5), borda 0,3 mm, raio 2,4 mm, texto de 5,4 mm (negrito).
  caixa(doc, 4, 2.5, 97, 8, 2.4, { fundo: FOLHA, borda: TINTA, bw: 0.3 });
  textoCentrado(doc, p.nome || '', cx, 6.5, 5.4, 97 - 2 * 15 - 0.6);

  // Tipos no cabeçalho: discos de 6,4 mm em (4,8; 3,3), passo 7,1 mm, até 2.
  ApresentacaoCarta.tiposCabecalho(p.tipos).forEach(function (t, i) {
    const x = 4.8 + i * 7.1, y = 3.3;
    circulo(doc, x + 3.2, y + 3.2, 3.2, { fundo: corTipo(t), borda: TINTA, bw: 0.3 });
    desenharIcone(doc, 'tipo', t, x + 1.1, y + 1.1, 4.2);
  });

  // Estágio: 1 a 3 bolinhas de 3 mm, em (4; 54,9), passo 4 mm.
  const estagio = cadeia.estagios[p.nome] || 1;
  for (let s = 1; s <= 3; s++) {
    const x = 4 + (s - 1) * 4, y = 54.9;
    if (s <= estagio) circulo(doc, x + 1.5, y + 1.5, 1.5, { fundo: TINTA });
    else circulo(doc, x + 1.5, y + 1.5, 1.5, { fundo: FOLHA, borda: TINTA, bw: 0.4 });
  }

  // Resistências: até 3 chips de 5,75 mm, no canto inferior direito da imagem (gap 1,2 mm).
  const mapa = p.resistencias || {};
  const chips = Object.keys(mapa)
    .filter(function (t) { return PRIORIDADE_EFEITO[mapa[t]] !== undefined; })
    .sort(function (a, b) { return PRIORIDADE_EFEITO[mapa[a]] - PRIORIDADE_EFEITO[mapa[b]]; })
    .slice(0, MAX_CHIPS);
  const larguraChips = chips.length * 5.75 + Math.max(0, chips.length - 1) * 1.2;
  const x0Chips = 102 - larguraChips;
  chips.forEach(function (tipo, i) {
    const x = x0Chips + i * (5.75 + 1.2), y = 56.9 - 5.75;
    circulo(doc, x + 2.875, y + 2.875, 2.875, { fundo: corTipo(tipo), borda: TINTA, bw: 0.3 });
    desenharIcone(doc, 'tipo', tipo, x + 0.9, y + 0.9, 3.95);
    // símbolo do efeito: disco branco de 2,4 mm, centro no canto inferior direito do chip
    const ax = x + 5.35, ay = y + 5.35;
    circulo(doc, ax, ay, 1.2, { fundo: FOLHA, borda: TINTA, bw: 0.25 });
    desenharIcone(doc, 'efeito', mapa[tipo], ax - 0.65, ay - 0.65, 1.3, { cor: TINTA });
  });

  // 2. Linha de vida: 2 linhas de corações de 1 cm, 8 por linha. Bloco 83,5 x 21 mm centrado em 63,4.
  const vida = inteiro(p.vida, 0);
  const x0Vida = 3 + (99 - 83.5) / 2, y0Vida = 63.4;
  for (let k = 0; k < Math.min(vida, VIDA_MAX); k++) {
    const col = k % 8, linha = Math.floor(k / 8);
    desenharIcone(doc, 'geral', 'coracao', x0Vida + col * 10.5, y0Vida + linha * 11, 10,
      { cor: CORACAO, preenche: CORACAO });
  }

  // 3. Atributos: 4 colunas de 24 mm em x = 3, 28, 53, 78; ícone de 10 mm em y = 88,4; caixas de 2,6 mm em y = 98,9.
  const valores = atributosDaForma(p, cadeia);
  ORDEM_ATRIBUTOS.forEach(function (k, i) {
    const a = valores[k];
    const x0 = 3 + i * 25;
    desenharIcone(doc, 'atributo', k, x0 + 7, 88.4, 10);
    const ligadas = Math.min(a.base, a.slots);
    const total = a.slots * 2.6 + Math.max(0, a.slots - 1) * 0.6;
    let x = x0 + 12 - total / 2;
    for (let j = 0; j < a.slots; j++) {
      caixa(doc, x, 98.9, 2.6, 2.6, 0.45, { fundo: j < ligadas ? TINTA : FOLHA, borda: TINTA, bw: 0.35 });
      x += 2.6 + 0.6;
    }
  });

  // 4. Golpes: 4 linhas contíguas de 10 mm a partir de y = 105,5. Quadrado de liberação, caixa do golpe, colunas.
  (p.golpes || []).slice(0, GOLPES).forEach(function (g, idx) {
    const y = 105.5 + idx * 10;
    const liberado = idx < habLib;
    // quadrado de liberação
    caixa(doc, 3, y, 10, 10, 1.5, { fundo: FOLHA, borda: TINTA, bw: 0.4 });
    if (liberado) desenharIcone(doc, 'geral', 'marcado', 3 + 1.25, y + 1.25, 7.5, { traco: 2.6 });
    // caixa do golpe: x 14,5, largura 87,5, raio 2,4, fundo do tipo a 22% (só se liberado)
    const fundoGolpe = liberado ? misturarComBranco(corTipo(g.tipo || 'normal'), 0.22) : FOLHA;
    caixa(doc, 14.5, y, 87.5, 10, 2.4, { fundo: fundoGolpe, borda: TINTA, bw: 0.35 });
    // ícone do golpe: coluna 15,5 (10 mm)
    desenharIcone(doc, 'golpe', g.icone, 15.5, y, 10);
    // nome: coluna 26,5 com 37 mm, até 2 linhas de 3,6 mm, line-height 1,05
    const SIZE_NOME = 3.6, LH = 1.05 * SIZE_NOME;
    doc.font(FONTE).fontSize(SIZE_NOME);
    const linhas = quebrarLinhas(doc, g.nome || '', 37, 2);
    const topoBloco = (y + 5) - linhas.length * LH / 2;
    linhas.forEach(function (ln, i) {
      const base = topoBloco + i * LH + (LH - (ASC + DESC) * SIZE_NOME) / 2 + ASC * SIZE_NOME;
      texto(doc, ln, 26.5, base, SIZE_NOME);
    });
    // dado: coluna 64,5 com 8 mm, texto d4 / d6 / d8, 4,5 mm
    const rotulo = ApresentacaoCarta.rotuloDado(g.dado);
    if (rotulo) textoCentrado(doc, rotulo, 64.5 + 4, y + 5, 4.5);
    else console.warn(g.nome + ': dado ' + g.dado + ' não é válido (só d4, d6 e d8).');
    // "+" e ícone do atributo (Força ou Energia, pela categoria): colunas 73,5 (3 mm) e 77,5 (10 mm)
    const atributo = ATRIBUTO_DO_GOLPE[g.categoria];
    if (atributo) {
      desenharIcone(doc, 'simbolo', 'mais', 73.5, y + 3.5, 3);
      desenharIcone(doc, 'atributo', atributo, 77.5, y, 10);
    } else {
      console.warn(g.nome + ': categoria ' + g.categoria + ' sem atributo (fisico ou elemental).');
    }
    // bolinhas de uso: largura 12 mm, alinhadas à direita (100,5), passo 4,2 mm, diâmetro 3,4 mm
    const usos = g.usos === null || g.usos === undefined ? 0 : inteiro(g.usos, 0);
    if (usos) {
      const total = usos * 3.4 + (usos - 1) * 0.8;
      let x = 100.5 - total;
      for (let j = 0; j < usos; j++) {
        circulo(doc, x + 1.7, y + 5, 1.7, { fundo: FOLHA, borda: TINTA, bw: 0.35 });
        x += 3.4 + 0.8;
      }
    }
  });

  doc.restore();
}

function desenharVerso(doc, p) {
  doc.save();
  doc.rect(0, 0, CARTA.w, CARTA.h).clip();
  baseCarta(doc);

  const marcas = new Map();
  (p.trilho || []).forEach(function (m) { marcas.set(Number(m.pos), m); });
  const inicio = inteiro(p.inicio, 1) || 1;
  const evolucoes = listaEvolucoes(p);
  const L = TRILHO.colunas, Q = TRILHO.quadrado, E = TRILHO.espaco;
  const larg = L * Q + (L - 1) * E;
  const alt = TRILHO.linhas * Q + (TRILHO.linhas - 1) * E;
  const x0 = (CARTA.w - larg) / 2, y0 = (CARTA.h - alt) / 2;

  for (let pos = 1; pos <= TRILHO.tamanho; pos++) {
    const idx = pos - 1;
    const x = x0 + (idx % L) * (Q + E), y = y0 + Math.floor(idx / L) * (Q + E);
    const m = marcas.get(pos);
    const fundo = m && MARCA_COR[m.tipo] ? MARCA_COR[m.tipo] : FOLHA;
    const evoItem = m && m.tipo === 'evolucao' && evolucoes.some(function (e) { return Number(e.pos) === pos && e.requisito; });
    // quadradinho: 10 mm, raio 1,2, borda 0,4 (evolução 0,7; "próximo" é borda dupla)
    if (pos === inicio) {
      caixa(doc, x, y, Q, Q, 1.2, { fundo: fundo });
      // borda dupla: anel externo (0-0,4 mm) e anel interno (0,8-1,2 mm)
      doc.save();
      doc.lineWidth(0.4).roundedRect(x + 0.2, y + 0.2, Q - 0.4, Q - 0.4, 1.0).stroke(TINTA);
      doc.lineWidth(0.4).roundedRect(x + 1.0, y + 1.0, Q - 2.0, Q - 2.0, 0.2).stroke(TINTA);
      doc.restore();
    } else if (m && m.tipo === 'evolucao') {
      caixa(doc, x, y, Q, Q, 1.2, { fundo: fundo, borda: TINTA, bw: 0.7 });
    } else {
      caixa(doc, x, y, Q, Q, 1.2, { fundo: fundo, borda: TINTA, bw: 0.4 });
    }
    if (m) {
      desenharIcone(doc, 'trilho', m.tipo, x + 1.5, y + 1.5, 7);
    }
    if (evoItem) {
      // item (pedra/troca) no canto inferior direito: disco de 4 mm
      const ix = x + 7, iy = y + 7;
      circulo(doc, ix + 2, iy + 2, 2, { fundo: FOLHA, borda: TINTA, bw: 0.3 });
      desenharIcone(doc, 'geral', 'item', ix + 0.7, iy + 0.7, 2.6);
    }
  }
  doc.restore();
}

// ---------------------------------------------------------------- folha A4: geometria e marcas

function geometriaFolha(opts) {
  const banda = opts.cortes || opts.registro ? BANDA_MARCAS : 0;
  const inset = opts.margem + banda;
  const s = Math.min((A4.w - 2 * inset) / A4.w, (A4.h - 2 * inset) / A4.h);
  return {
    s: s,
    ox: (A4.w - A4.w * s) / 2,
    oy: (A4.h - A4.h * s) / 2,
    cw: CARTA.w * s,
    ch: CARTA.h * s
  };
}

// Marcas de registro: cruzes na margem. Posições fixas e simétricas em relação ao centro do A4,
// então frente e verso têm as mesmas marcas e o espelho (virar pelo lado longo) as sobrepõe.
function posicoesRegistro(opts) {
  const d = opts.margem + 1.6;
  return [
    { x: d, y: A4.h * 0.25 }, { x: d, y: A4.h * 0.75 },
    { x: A4.w - d, y: A4.h * 0.25 }, { x: A4.w - d, y: A4.h * 0.75 },
    { x: A4.w * 0.25, y: d }, { x: A4.w * 0.75, y: d },
    { x: A4.w * 0.25, y: A4.h - d }, { x: A4.w * 0.75, y: A4.h - d }
  ];
}

// Marcas de corte: nas bordas externas da grade, nas linhas de corte entre as cartas (0,5 a 3 mm para fora).
function desenharCortes(doc, geo) {
  const xs = [0, 1, 2].map(function (k) { return geo.ox + k * geo.cw; });
  const ys = [0, 1, 2].map(function (k) { return geo.oy + k * geo.ch; });
  const direita = geo.ox + 2 * geo.cw, base = geo.oy + 2 * geo.ch;
  doc.save();
  doc.lineWidth(0.2).strokeColor(TINTA);
  xs.forEach(function (x) {
    doc.moveTo(x, geo.oy - 0.5).lineTo(x, geo.oy - 3).stroke();
    doc.moveTo(x, base + 0.5).lineTo(x, base + 3).stroke();
  });
  ys.forEach(function (y) {
    doc.moveTo(geo.ox - 0.5, y).lineTo(geo.ox - 3, y).stroke();
    doc.moveTo(direita + 0.5, y).lineTo(direita + 3, y).stroke();
  });
  doc.restore();
}

function desenharRegistro(doc, opts) {
  const b = 1.25;
  doc.save();
  doc.lineWidth(0.2).strokeColor(TINTA);
  posicoesRegistro(opts).forEach(function (p) {
    doc.moveTo(p.x - b, p.y).lineTo(p.x + b, p.y).stroke();
    doc.moveTo(p.x, p.y - b).lineTo(p.x, p.y + b).stroke();
  });
  doc.restore();
}

// Uma folha A4 com as cartas do grupo (até 4), na ordem de slots 0..3 (linha a linha, da esquerda).
function desenharFolha(doc, grupo, lado, opts, cadeia) {
  doc.addPage({ size: 'A4', margin: 0 });
  const geo = geometriaFolha(opts);
  doc.save();
  doc.scale(MM); // a partir daqui, 1 unidade = 1 mm
  if (opts.cortes) desenharCortes(doc, geo);
  if (opts.registro) desenharRegistro(doc, opts);
  const cartas = lado === 'verso' && opts.espelhar ? SelecaoImpressao.espelharVerso(grupo) : grupo;
  for (let k = 0; k < POR_FOLHA; k++) {
    const carta = cartas[k];
    if (!carta) continue;
    const c = k % 2, r = Math.floor(k / 2);
    doc.save();
    doc.translate(geo.ox + c * geo.cw, geo.oy + r * geo.ch);
    doc.scale(geo.s);
    if (lado === 'frente') desenharFrente(doc, carta, opts, cadeia);
    else desenharVerso(doc, carta);
    doc.restore();
  }
  doc.restore();
}

// ---------------------------------------------------------------- saída

function gravarPdf(arquivo, paginas, opts, cadeia, titulo) {
  return new Promise(function (resolver, rejeitar) {
    const doc = new PDFDocument({ autoFirstPage: false, size: 'A4', margin: 0, info: { Title: titulo } });
    const fluxo = fs.createWriteStream(arquivo);
    fluxo.on('finish', resolver);
    fluxo.on('error', rejeitar);
    doc.on('error', rejeitar);
    doc.pipe(fluxo);
    paginas.forEach(function (pg) { desenharFolha(doc, pg.grupo, pg.lado, opts, cadeia); });
    doc.end();
  });
}

function lerOpcoes(argv) {
  const o = {
    margem: 4, cortes: true, registro: true, espelhar: true,
    ids: null, liberados: 1, fonte: FONTE_PADRAO, saida: PASTA_SAIDA, ajuda: false
  };
  const sim = function (v, nome) {
    if (v === 'on') return true;
    if (v === 'off') return false;
    throw new Error(nome + ' aceita on ou off, recebeu "' + v + '".');
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const prox = function () {
      if (i + 1 >= argv.length) throw new Error(a + ' precisa de um valor.');
      return argv[++i];
    };
    if (a === '--ajuda' || a === '-h') o.ajuda = true;
    else if (a === '--margem') {
      o.margem = Number(prox());
      if (!(o.margem >= 0 && o.margem < 40)) throw new Error('--margem precisa ser um número de 0 a 40 (mm).');
    } else if (a === '--cortes') o.cortes = sim(prox(), '--cortes');
    else if (a === '--registro') o.registro = sim(prox(), '--registro');
    else if (a === '--espelhar') o.espelhar = sim(prox(), '--espelhar');
    else if (a === '--ids') o.ids = prox();
    else if (a === '--liberados') {
      o.liberados = Number(prox());
      if (!(o.liberados >= 0 && o.liberados <= GOLPES)) throw new Error('--liberados precisa ser de 0 a ' + GOLPES + '.');
    } else if (a === '--fonte') o.fonte = prox();
    else if (a === '--saida') o.saida = path.resolve(prox());
    else throw new Error('opção desconhecida: ' + a + ' (use --ajuda).');
  }
  return o;
}

// "1-12", "1,4,25-30" -> Set de números
function lerIds(texto) {
  const ids = new Set();
  String(texto).split(',').map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (t) {
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(t);
    if (m) {
      for (let n = Number(m[1]); n <= Number(m[2]); n++) ids.add(n);
    } else if (/^\d+$/.test(t)) {
      ids.add(Number(t));
    } else {
      throw new Error('--ids inválido: "' + t + '". Use 1-12 ou 1,4,25-30.');
    }
  });
  return ids;
}

async function principal(argv) {
  const opts = lerOpcoes(argv);
  if (opts.ajuda) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace('/*', '').trim());
    return;
  }
  if (!fs.existsSync(opts.fonte)) throw new Error('fonte não encontrada: ' + opts.fonte + ' (use --fonte).');
  FONTE = opts.fonte;

  const dados = JSON.parse(fs.readFileSync(ARQ_DADOS, 'utf8'));
  if (!Array.isArray(dados)) throw new Error(ARQ_DADOS + ' precisa ser uma lista.');

  const selecao = opts.ids ? lerIds(opts.ids) : new Set(dados.map(function (p) { return Number(p.id); }));
  const especies = SelecaoImpressao.filtrar(dados, selecao);
  if (!especies.length) throw new Error('nenhuma espécie selecionada.');
  verificarDados(especies).forEach(function (a) { console.warn('AVISO: ' + a); });

  const cadeia = calcularCadeia(dados);
  const grupos = SelecaoImpressao.agrupar(especies, POR_FOLHA);
  const frente = grupos.map(function (grupo) { return { grupo: grupo, lado: 'frente' }; });
  const verso = grupos.map(function (grupo) { return { grupo: grupo, lado: 'verso' }; });
  const intercalado = [];
  grupos.forEach(function (grupo) {
    intercalado.push({ grupo: grupo, lado: 'frente' }, { grupo: grupo, lado: 'verso' });
  });

  fs.mkdirSync(opts.saida, { recursive: true });
  const saidas = [
    ['cartas-frente.pdf', frente, 'Cartas: frente'],
    ['cartas-verso.pdf', verso, 'Cartas: verso (trilho)'],
    ['cartas-A4.pdf', intercalado, 'Cartas: frente e verso intercalados']
  ];
  for (const [nome, paginas, titulo] of saidas) {
    const arq = path.join(opts.saida, nome);
    await gravarPdf(arq, paginas, opts, cadeia, titulo);
    console.log(nome + ': ' + paginas.length + ' folha(s), ' + Math.round(fs.statSync(arq).size / 1024) + ' KB');
  }
  const geo = geometriaFolha(opts);
  console.log('Cartas: ' + especies.length + ' (' + grupos.length + ' folha(s) de frente e verso). ' +
    'Escala da grade: ' + geo.s.toFixed(4) + ' (carta ' + (CARTA.w * geo.s).toFixed(2) + ' x ' +
    (CARTA.h * geo.s).toFixed(2) + ' mm). Margem ' + opts.margem + ' mm.');
}

module.exports = { geometriaFolha, posicoesRegistro, lerOpcoes, TRILHO, MM, A4, CARTA };

if (require.main === module) {
  principal(process.argv.slice(2)).catch(function (e) {
    console.error('ERRO: ' + e.message);
    process.exit(1);
  });
}
