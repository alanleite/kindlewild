/* Escolhe de onde o site lê as criaturas. Ordem: ?dados=<arquivo> (fixtures), ?cenario=<id>,
   e por fim o cenário padrão de cenarios/padrao.txt. As imagens (`imagem` da criatura) são
   relativas à pasta do arquivo de dados. Ver lib/cenario.js (mesma convenção no Node). */
(function () {
  'use strict';

  var PASTA_CENARIOS = '../cenarios/';

  async function cenarioPadrao() {
    var resposta = await fetch(PASTA_CENARIOS + 'padrao.txt', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Nenhum cenário escolhido: use ?cenario=<id> ou crie cenarios/padrao.txt.');
    return (await resposta.text()).trim();
  }

  async function fonteDados() {
    var params = new URL(location.href).searchParams;
    var url = params.get('dados');
    if (!url) url = PASTA_CENARIOS + (params.get('cenario') || await cenarioPadrao()) + '/criaturas.json';
    return { url: url, prefixoImagem: url.slice(0, url.lastIndexOf('/') + 1) };
  }

  window.CenarioWeb = Object.freeze({ fonteDados: fonteDados });
})();
