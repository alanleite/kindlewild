(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.ApresentacaoCarta = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DADOS = { d4: true, d6: true, d8: true, d12: true };
  var EFEITOS = ['fraqueza', 'veneno', 'paralisia', 'sono', 'ligeiro', 'escudo', 'forca_extra', 'cura'];
  var ATRIBUTOS = ['forca', 'energia'];
  var CARGAS = [1, 2, 3];
  // Formato antigo (tipo/categoria/usos), aceito durante a transição.
  var CATEGORIA_ANTIGA = { fisico: 'forca', elemental: 'energia' };

  function rotuloDado(dado) {
    return typeof dado === 'string' && Object.prototype.hasOwnProperty.call(DADOS, dado) ? dado : null;
  }

  function tiposCabecalho(tipos) {
    return (Array.isArray(tipos) ? tipos : []).filter(Boolean).slice(0, 2);
  }

  // Golpe no formato novo (elemento, atributo, dado, cargas, efeito, area), a partir do novo ou do antigo.
  function normalizarGolpe(g) {
    g = g || {};
    var novo = 'elemento' in g || 'atributo' in g || 'cargas' in g || 'efeito' in g || 'area' in g;
    var atributo = novo ? g.atributo : CATEGORIA_ANTIGA[g.categoria];
    var cargas = 'cargas' in g ? g.cargas : g.usos;
    return {
      nome: g.nome || '',
      icone: g.icone,
      elemento: g.elemento || g.tipo || 'normal',
      atributo: atributo === undefined ? null : atributo,
      dado: g.dado === undefined ? null : g.dado,
      cargas: cargas === undefined ? null : cargas,
      efeito: g.efeito === undefined ? null : g.efeito,
      area: g.area === true,
      antigo: !novo
    };
  }

  // Problemas de um golpe (já normalizado) frente ao catálogo de golpes.
  function problemasGolpe(g) {
    var p = [];
    var nome = g.nome || '(sem nome)';
    if (g.dado === null) {
      if (g.atributo !== null) p.push(nome + ': golpe de suporte não tem atributo');
      if (!g.efeito) p.push(nome + ': golpe de suporte precisa de efeito');
    } else {
      if (!rotuloDado(g.dado)) p.push(nome + ': dado ' + g.dado + ' (só d4, d6, d8 e d12)');
      if (ATRIBUTOS.indexOf(g.atributo) < 0) p.push(nome + ': atributo ' + g.atributo + ' (forca ou energia)');
    }
    if (g.cargas !== null && CARGAS.indexOf(g.cargas) < 0) p.push(nome + ': cargas ' + g.cargas + ' (3, 2, 1 ou ilimitado)');
    if (g.efeito !== null && EFEITOS.indexOf(g.efeito) < 0) p.push(nome + ': efeito ' + g.efeito + ' desconhecido');
    return p;
  }

  return {
    normalizarGolpe: normalizarGolpe,
    problemasGolpe: problemasGolpe,
    EFEITOS: EFEITOS,
    rotuloDado: rotuloDado,
    tiposCabecalho: tiposCabecalho
  };
}));
