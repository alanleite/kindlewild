(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.SelecaoImpressao = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function filtrar(especies, idsSelecionados) {
    return especies
      .filter(function (p) { return idsSelecionados.has(Number(p.id)); })
      .slice()
      .sort(function (a, b) { return Number(a.id) - Number(b.id); });
  }

  function correspondeBusca(criatura, termo) {
    var busca = String(termo || '').trim().toLocaleLowerCase('pt-BR');
    if (!busca) return true;
    if (/^#?\d+$/.test(busca)) return Number(busca.replace('#', '')) === Number(criatura.id);
    return String(criatura.nome || '').toLocaleLowerCase('pt-BR').includes(busca);
  }

  function selecionarTodos(especies) {
    return new Set(especies.map(function (p) { return Number(p.id); }));
  }

  function resumir(quantidade, total, porPagina) {
    var folhas = quantidade ? Math.ceil(quantidade / porPagina) : 0;
    return {
      folhas: folhas,
      impressaoDesativada: quantidade === 0,
      selecao: quantidade + ' de ' + total + ' selecionados',
      texto: quantidade + (quantidade === 1 ? ' selecionado' : ' selecionados') + ' · ' +
        (folhas ? folhas + (folhas === 1 ? ' folha' : ' folhas') + ' de frente e verso' : 'nenhuma folha')
    };
  }

  function agrupar(cartas, tamanho) {
    var grupos = [];
    for (var i = 0; i < cartas.length; i += tamanho) {
      grupos.push(cartas.slice(i, i + tamanho));
    }
    return grupos;
  }

  function espelharVerso(grupo) {
    return [grupo[1], grupo[0], grupo[3], grupo[2]];
  }

  function configuracaoTrilho() {
    return {
      tamanho: 70,
      colunas: 7,
      linhas: 10,
      posicoes: Array.from({ length: 70 }, function (_, i) { return i + 1; })
    };
  }

  function validarEstruturaTrilho(criatura) {
    var tamanho = configuracaoTrilho().tamanho;
    var marcas = criatura.trilho || [];
    var posicoes = marcas.map(function (m) { return Number(m.pos); });
    var problemas = [];
    // Única repetição permitida: marcos de evolução na posição 40 (pedras e troca; espécies com várias evoluções).
    var repetida = posicoes.some(function (pos, i) {
      return posicoes.indexOf(pos) !== i && !(pos === 40 && marcas[i].tipo === 'evolucao' &&
        marcas[posicoes.indexOf(pos)].tipo === 'evolucao');
    });
    if (repetida) problemas.push('posição repetida');
    if (posicoes.some(function (pos) { return pos < 1 || pos > tamanho; })) {
      problemas.push('marca fora da posição 1 a ' + tamanho);
    }
    for (var i = 1; i < posicoes.length; i++) {
      if (posicoes[i] < posicoes[i - 1]) {
        problemas.push('marcas fora de ordem');
        break;
      }
    }
    return problemas;
  }

  return {
    filtrar: filtrar,
    correspondeBusca: correspondeBusca,
    selecionarTodos: selecionarTodos,
    resumir: resumir,
    agrupar: agrupar,
    espelharVerso: espelharVerso,
    configuracaoTrilho: configuracaoTrilho,
    validarEstruturaTrilho: validarEstruturaTrilho
  };
}));
