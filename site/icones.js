/* Mapa de ícones dos cards. Cada entrada é um SVG completo, traço simples, 24 x 24,
   cor = currentColor (o CSS define a cor e o tamanho).
   Para trocar um ícone depois, substitua o SVG da chave correspondente.
   Chave que não existe no mapa cai no placeholder (forma geométrica neutra).
   Grupos: tipo (tipos da criatura e resistências), golpe, atributo, trilho, efeito, dado, simbolo ("+"), geral.
   Sem cadeado: golpe não liberado é quadrado vazio; liberado é quadrado com "marcado".
   Ver docs/design-system.md. */
(function () {
  'use strict';

  function svg(corpo) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + corpo + '</svg>';
  }

  // Desenhos reaproveitados em mais de um grupo.
  var RAIO = '<path d="M13 2.5 5.5 13.5H12l-1 8 7.5-11H12z"/>';
  var CHAMA = '<path d="M12 3c1.5 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.2 1-3.8 2.3-5 .2 1.8 1 2.8 2.2 3.2C10.6 9.5 10.8 6 12 3z"/>';
  var GOTA = '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>';
  var FOLHA = '<path d="M5 19C4.5 10 9.5 5 20 4c.5 10-4.5 15-15 15z"/><path d="M5 19l8.5-8.5"/>';
  var MONTANHA = '<path d="M2.5 20 9 8.5l4 6.5 2.5-3.5L21.5 20z"/>';
  var FLOCO = '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>';
  var ASA = '<path d="M3 15c3-6 8-8 18-9-2 5-5 9-11 10-3 .5-5 0-7-1z"/>';
  var BOLHAS = '<circle cx="9" cy="15" r="3.5"/><circle cx="16" cy="9.5" r="2.5"/><circle cx="15.5" cy="17.5" r="1.5"/>';
  var OLHO = '<path d="M2 12c3-5.5 17-5.5 20 0-3 5.5-17 5.5-20 0z"/><circle cx="12" cy="12" r="2.8"/>';
  var PEDRA = '<path d="M6 19.5 3 12l4-7 8-1.5 5 5.5-1 8.5-6.5 2.5z"/>';
  var BOLINHA = '<circle cx="12" cy="12" r="8"/>';
  var PUNHO = '<rect x="5" y="8" width="12" height="10" rx="3.5"/><path d="M9 8V5.5M12.5 8V4.5M15.5 8V5.5M17 12.5h2"/>';
  var FERRAO = '<path d="M12 3v7"/><path d="M8 11c0 4 1.8 7 4 10 2.2-3 4-6 4-10z"/>';
  var FANTASMA = '<path d="M6 21V11a6 6 0 0 1 12 0v10l-2-2-2 2-2-2-2 2-2-2z"/><circle cx="10" cy="11" r="1" fill="currentColor"/><circle cx="14" cy="11" r="1" fill="currentColor"/>';
  var DRAGAO = '<path d="M3 17c2-6 6-9 9-9 1 3 4 4 9 3-2 4-5 7-9 7-2 0-4-1-5-1-1 0-2 0-4 0z"/>';
  // Punho em contorno, com divisões internas para manter os dedos legíveis em impressão.
  var MAO = '<path d="M6.5 11V8.5a2 2 0 0 1 4 0V11M10.5 10V6.5a2 2 0 0 1 4 0V10M14.5 10V7.5a2 2 0 0 1 4 0V12"/>' +
    '<path d="M18.5 10.5a2 2 0 0 1 4 0v3.3a8 8 0 0 1-8 8h-2.2A8.3 8.3 0 0 1 4 13.5V12a2 2 0 0 1 4 0v2"/>' +
    '<path d="M8 12h8a2 2 0 0 1 0 4h-4"/>';
  var FORCA = MAO;
  var ENERGIA = RAIO;
  // Tênis de perfil em contorno, com cadarço, sola e linhas de movimento.
  var SAPATO = '<path d="M10.5 4.5 15 8l-1.8 2.4 2.5 2.3a5 5 0 0 0 3.4 1.3H22v3.5H11.8a5 5 0 0 1-3.9-1.9L5 12"/>' +
    '<path d="M10.5 4.5 5 9.2a1.7 1.7 0 0 0-.2 2.4L8 15.3M12 9.3l2 1.6M10.5 11l2 1.6M11.8 20H22M2 12.5h3M2.5 16h4"/>';
  var AGILIDADE = SAPATO;
  var DEFESA = '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>';
  var GARRA = '<path d="M7 4c.8 4.5.8 9-1.5 16M12 3c1 5.5 1 10-1 18M17 4c0 5 0 10 1.5 16"/>';
  var SOCO = PUNHO;
  var CORACAO = '<path d="M12 20.5C5.5 16 3 12.5 3 9a4.5 4.5 0 0 1 9-1.2A4.5 4.5 0 0 1 21 9c0 3.5-2.5 7-9 11.5z"/>';
  var ESTRELA = '<path d="M12 3l2.6 6 6.4.4-5 4.2 1.6 6.3L12 16.6 6.4 20 8 13.6 3 9.4 9.4 9z"/>';
  var LAMPADA = '<path d="M9 17.5h6M10 20.5h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>';
  var EXPLOSAO = '<path d="M12 2l1.5 6L19 5l-3 5.5L22 12l-6 1.5 3 5.5-5.5-3L12 22l-1.5-6L5 19l3-5.5L2 12l6-1.5L5 5l5.5 3z"/>';
  var SETA_CIMA = '<path d="M12 21V4M6 10l6-6 6 6"/>';
  var SETA_BAIXO = '<path d="M12 3v17M6 14l6 6 6-6"/>';
  var PROIBIDO = '<circle cx="12" cy="12" r="8.5"/><path d="M5.6 5.6l12.8 12.8"/>';
  var ALERTA = '<path d="M12 4 21.5 20h-19z"/><path d="M12 10v4.5"/><path d="M12 17.3v.1"/>';
  var GEMA = '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18"/>';
  var MARCADO = '<path d="M4.5 12.5l5 5L19.5 6.5"/>';

  // Formas dos dados usados nos golpes: d4, d6, d8 e d12 (especificação, seção 15).
  // A face é desenhada com pontos (sem número): d4 tem 4 pontos, d6 tem 6, d8 tem 8.
  // O pontinho é preenchido (fill currentColor), o contorno é o traço do ícone.
  var PONTO = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="currentColor" stroke="none"/>'; };
  var D4 = '<path d="M12 3.5 21 19.5H3z"/>' +
    PONTO(12, 9.6, 1.7) + PONTO(9.2, 15.4, 1.7) + PONTO(14.8, 15.4, 1.7) + PONTO(12, 17.6, 1.7);
  var D6 = '<rect x="4" y="4" width="16" height="16" rx="3"/>' +
    PONTO(8.5, 8, 2) + PONTO(15.5, 8, 2) + PONTO(8.5, 12, 2) + PONTO(15.5, 12, 2) + PONTO(8.5, 16, 2) + PONTO(15.5, 16, 2);
  var D8 = '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/>' +
    PONTO(15, 5.5, 1.6) + PONTO(18.5, 9, 1.6) + PONTO(18.5, 15, 1.6) + PONTO(15, 18.5, 1.6) +
    PONTO(9, 18.5, 1.6) + PONTO(5.5, 15, 1.6) + PONTO(5.5, 9, 1.6) + PONTO(9, 5.5, 1.6);

  var D12 = '<path d="M12 2.5 19.6 6.2 21.5 14.4 16.3 21 7.7 21 2.5 14.4 4.4 6.2z"/>' +
    '<path d="M12 8 16.2 11 14.6 16 9.4 16 7.8 11z"/>';

  // Tokens de efeito dos golpes (catálogo de golpes, seção 1.5): disco colorido com um desenho
  // na cor da tinta. A cor ajuda; o desenho sozinho já distingue cada efeito (impressão em P&B).
  function token(cor, desenho) {
    return '<circle cx="12" cy="12" r="10" fill="' + cor + '"/>' +
      '<g transform="translate(4.8 4.8) scale(0.6)">' + desenho + '</g>';
  }
  var PENA = '<path d="M20 3C10 3 5 8.5 5 15.5 5 17 5.4 18.5 6 19.5 13 19.5 19.5 14 20 3z"/><path d="M4 21 15 9"/>';
  var ZZ = '<path d="M5 6h7L5 14h7M13 11h6l-6 7h6"/>';
  var TOKENS = {
    fraqueza: token('#b4b8c2', SETA_BAIXO),
    veneno: token('#b27ad8', GOTA),
    paralisia: token('#ffd23a', RAIO),
    sono: token('#6f9cf0', ZZ),
    ligeiro: token('#7fdcea', PENA),
    escudo: token('#f2a640', DEFESA),
    forca_extra: token('#ff6b6b', SETA_CIMA),
    cura: token('#6fcf8a', CORACAO)
  };

  // Área: acerta vários alvos (um círculo grande atrás e dois à frente).
  var AREA = '<circle cx="12" cy="7" r="3"/><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/>' +
    '<path d="M9 11.5 10.5 9.5M15 11.5 13.5 9.5M9.5 16h5" stroke-dasharray="1.5 2.2"/>';

  // Sinal de soma entre o dado e o atributo ("+ Força"). Símbolo, não número.
  var MAIS = '<path d="M12 5v14M5 12h14" stroke-width="3"/>';

  var PLACEHOLDER = svg('<rect x="5" y="5" width="14" height="14" rx="3" stroke-dasharray="3 2.5"/>');

  var MAPA = {
    tipo: {
      eletrico: RAIO,
      fogo: CHAMA,
      agua: GOTA,
      planta: FOLHA,
      terra: MONTANHA,
      gelo: FLOCO,
      voador: ASA,
      veneno: BOLHAS,
      psiquico: OLHO,
      pedra: PEDRA,
      normal: BOLINHA,
      lutador: PUNHO,
      inseto: FERRAO,
      fantasma: FANTASMA,
      dragao: DRAGAO
    },
    golpe: {
      raio: RAIO,
      garra: GARRA,
      soco: SOCO,
      gota: GOTA,
      chama: CHAMA,
      folha: FOLHA,
      gelo: FLOCO,
      floco: FLOCO,
      terra: MONTANHA,
      pedra: PEDRA,
      veneno: BOLHAS,
      olho: OLHO,
      punho: PUNHO,
      bolha: BOLHAS,
      montanha: MONTANHA,
      asa: ASA,
      ferrao: FERRAO,
      bolinha: BOLINHA
    },
    atributo: {
      forca: FORCA,
      energia: ENERGIA,
      agilidade: AGILIDADE,
      defesa: DEFESA
    },
    trilho: {
      habilidade: LAMPADA,
      estrela: ESTRELA,
      coracao: CORACAO,
      forca: FORCA,
      poder: EXPLOSAO,
      evolucao: SETA_CIMA
    },
    efeito: {
      resistente: SETA_BAIXO,
      imune: PROIBIDO,
      vulneravel: ALERTA,
      fraqueza: TOKENS.fraqueza,
      veneno: TOKENS.veneno,
      paralisia: TOKENS.paralisia,
      sono: TOKENS.sono,
      ligeiro: TOKENS.ligeiro,
      escudo: TOKENS.escudo,
      forca_extra: TOKENS.forca_extra,
      cura: TOKENS.cura
    },
    dado: {
      d4: D4,
      d6: D6,
      d8: D8,
      d12: D12
    },
    simbolo: {
      mais: MAIS
    },
    geral: {
      coracao: CORACAO,
      item: GEMA,
      area: AREA,
      mao: MAO,
      sapato: SAPATO,
      marcado: MARCADO
    }
  };

  // Cache dos SVGs já montados (cada entrada vira svg(...) uma vez).
  var CACHE = {};

  window.ICONES = {
    // Devolve o SVG (string) do ícone, ou o placeholder se a chave não existir.
    obter: function (grupo, nome) {
      var desenho = (MAPA[grupo] || {})[nome];
      if (!desenho) return PLACEHOLDER;
      var chave = grupo + ':' + nome;
      if (!CACHE[chave]) CACHE[chave] = svg(desenho);
      return CACHE[chave];
    },
    // Forma do dado a partir da notação (ex.: "d6" ou "1d6" -> d6). Só d4, d6, d8 e d12; outros dão null.
    dado: function (notacao) {
      var m = /d(\d+)/i.exec(String(notacao || ''));
      if (!m) return null;
      var forma = 'd' + m[1];
      return MAPA.dado[forma] ? forma : null;
    },
    placeholder: PLACEHOLDER
  };
})();
