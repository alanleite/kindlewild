/* Legenda das cartas (site/legenda.html). Página para o adulto: texto permitido.
   Preenche os ícones marcados com data-grupo/data-nome, a grade de tipos e a ficha
   de efeitos de tipo a partir da mesma lista de espécies que a carta usa. */
(function () {
  'use strict';

  var TIPOS = [
    ['normal', 'Normal'], ['fogo', 'Fogo'], ['agua', 'Água'], ['eletrico', 'Elétrico'],
    ['planta', 'Planta'], ['gelo', 'Gelo'], ['lutador', 'Lutador'], ['veneno', 'Veneno'],
    ['terra', 'Terra'], ['voador', 'Voador'], ['psiquico', 'Psíquico'], ['inseto', 'Inseto'],
    ['pedra', 'Pedra'], ['fantasma', 'Fantasma'], ['dragao', 'Dragão']
  ];

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  function preencherIcones() {
    document.querySelectorAll('.icone[data-grupo]').forEach(function (span) {
      span.innerHTML = window.ICONES.obter(span.getAttribute('data-grupo'), span.getAttribute('data-nome'));
    });
  }

  function montarTipos() {
    var grade = document.getElementById('grade-tipos');
    TIPOS.forEach(function (t) {
      var item = el('div', 'legenda-item');
      var disco = el('span', 'tipo-disc');
      disco.style.setProperty('--cor-tipo', 'var(--tipo-' + t[0] + ')');
      var icone = el('span', 'icone');
      icone.innerHTML = window.ICONES.obter('tipo', t[0]);
      disco.append(icone);
      var texto = el('span');
      texto.append(document.createTextNode(t[1]));
      item.append(disco, texto);
      grade.append(item);
    });
  }

  // Ficha: todas as resistências de cada espécie (campo resistencias), por efeito.
  // Mesma ordem da carta: vulneráveis, imunes, resistentes.
  var EFEITOS = ['vulneravel', 'imune', 'resistente'];

  function ficha(especies) {
    var corpo = document.getElementById('ficha-corpo');
    corpo.textContent = '';
    especies.forEach(function (p) {
      var linha = el('tr');
      linha.append(el('td', 'nome-col', p.nome || ''));
      var grupos = { imune: [], vulneravel: [], resistente: [] };
      Object.keys(p.resistencias || {}).forEach(function (tipo) {
        var efeito = p.resistencias[tipo];
        if (grupos[efeito]) grupos[efeito].push(tipo);
      });
      EFEITOS.forEach(function (efeito) {
        var td = el('td');
        var lista = el('div', 'efeito-lista');
        (grupos[efeito] || []).forEach(function (tipo) {
          var rotulo = TIPOS.filter(function (t) { return t[0] === tipo; })[0];
          lista.append(el('span', null, rotulo ? rotulo[1] : tipo));
        });
        td.append(lista);
        linha.append(td);
      });
      corpo.append(linha);
    });
  }

  async function iniciar() {
    preencherIcones();
    montarTipos();
    var url = '';
    var status = document.getElementById('ficha-status');
    try {
      url = (await CenarioWeb.fonteDados()).url;
      var resposta = await fetch(url, { cache: 'no-store' });
      if (!resposta.ok) throw new Error('erro ' + resposta.status);
      var especies = await resposta.json();
      ficha(Array.isArray(especies) ? especies : []);
      status.textContent = especies.length + ' criaturas em ' + url + '.';
    } catch (e) {
      status.textContent = 'Não consegui ler ' + url + ' (' + e.message + '). Veja site/README.md sobre como servir a pasta.';
    }
  }

  iniciar();
})();
