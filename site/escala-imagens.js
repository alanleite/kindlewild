(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  raiz.EscalaImagens = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Normalização conservadora pela área de pixels visíveis de cada PNG: o fator vem do campo
  // `escala_imagem` da criatura (definido pelo cenário; padrão 1). O teto de 1,18 evita cortes
  // perceptíveis nas extremidades da arte.
  var TETO = 1.18;

  function obter(criatura) {
    var f = Number(criatura && criatura.escala_imagem);
    if (!(f > 0)) return 1;
    return Math.min(f, TETO);
  }

  return Object.freeze({ obter: obter, teto: TETO });
});
