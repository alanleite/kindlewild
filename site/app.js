/* Cartas do Kindlewild: lê a lista de criaturas do cenário e monta as folhas A4 (4 cartas A6 por folha).
   Cada grupo de 4 cartas gera duas folhas: frente (nome, imagem, tipos, vida, atributos,
   golpes, resistências) e verso (só o trilho de 70 quadradinhos).
   Sem framework e sem build. Ícones em icones.js. Regras visuais em docs/design-system.md.
   Ver site/README.md. */
(function () {
  'use strict';

  var POR_PAGINA = 4;          // cartas por folha A4
  var CONFIG_TRILHO = SelecaoImpressao.configuracaoTrilho();
  var GOLPES = 4;
  var MAX_CHIPS = 3;           // resistências visíveis na carta (seção 9)
  var CORACOES_POR_LINHA = 8;  // corações de 1 cm: 8 por linha, 2 linhas (16 no máximo)
  var VIDA_MAX = 16;           // acima disso o coração não cabe na área da linha de vida
  // De onde vêm os dados e as imagens: ver cenario-web.js (?dados=, ?cenario= ou cenarios/padrao.txt).
  // O campo `imagem` é relativo à pasta do arquivo de dados ("imagens/025.png").
  var prefixoImagem = '';
  // Frente e verso ficam em folhas separadas. O módulo SelecaoImpressao agrupa apenas
  // as cartas marcadas e espelha as colunas do verso para impressão na borda longa.

  var ORDEM_ATRIBUTOS = ['forca', 'energia', 'agilidade', 'defesa'];
  var TIPOS_CONHECIDOS = ['normal', 'fogo', 'agua', 'eletrico', 'planta', 'gelo', 'lutador', 'veneno',
    'terra', 'voador', 'psiquico', 'inseto', 'pedra', 'fantasma', 'dragao'];
  // Ordem dos chips: vulneráveis primeiro, depois imunes, depois resistentes (schema, campo resistencias).
  var PRIORIDADE_EFEITO = { vulneravel: 0, imune: 1, resistente: 2 };

  var estado = {
    especies: [],
    idsSelecionados: new Set(),
    habilidadesLiberadas: 1,
    estagios: {},     // nome -> estágio (1 a 3), pela cadeia de evolução
    anteriores: {},   // nome -> nome da forma anterior (só nas evoluídas)
    fora: []          // avisos de regra (trilho, golpes, perfil)
  };

  // ---------------------------------------------------------------- utilidades

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  // Ícone (SVG) de um grupo do mapa em icones.js. Chave desconhecida vira placeholder.
  function icone(grupo, nome, classe) {
    var span = el('span', 'icone' + (classe ? ' ' + classe : ''));
    span.innerHTML = window.ICONES.obter(grupo, nome);
    return span;
  }

  function corTipo(tipo) {
    return TIPOS_CONHECIDOS.indexOf(tipo) >= 0 ? 'var(--tipo-' + tipo + ')' : 'var(--tipo-padrao)';
  }

  function caminhoImagem(caminho) {
    if (!caminho) return null;
    if (/^(https?:|data:|\/)/.test(caminho)) return caminho;
    return prefixoImagem + caminho;
  }

  function inteiro(valor, minimo) {
    return Math.max(minimo, Math.floor(Number(valor) || 0));
  }

  function listaEvolucoes(p) {
    if (Array.isArray(p.evolucao)) return p.evolucao;
    return p.evolucao ? [p.evolucao] : [];
  }

  function mensagem(texto) {
    var caixa = document.getElementById('mensagem');
    caixa.textContent = texto;
    caixa.hidden = false;
  }

  function esconderMensagem() {
    document.getElementById('mensagem').hidden = true;
  }

  // ---------------------------------------------------------------- dados

  async function carregarDados(url) {
    var resposta;
    try {
      resposta = await fetch(url, { cache: 'no-store' });
    } catch (e) {
      throw new Error(
        'Não consegui ler ' + url + '. Se você abriu o index.html direto do computador (file://), ' +
        'o navegador bloqueia essa leitura. Na raiz do projeto, rode "python3 -m http.server" ' +
        'e acesse http://localhost:8000/site/ (detalhes no site/README.md).'
      );
    }
    if (!resposta.ok) {
      throw new Error('O arquivo ' + url + ' não foi encontrado (erro ' + resposta.status + ').');
    }
    var dados;
    try {
      dados = await resposta.json();
    } catch (e) {
      throw new Error('O arquivo ' + url + ' não é um JSON válido: ' + e.message);
    }
    if (!Array.isArray(dados)) {
      throw new Error('O arquivo ' + url + ' precisa ser uma lista (array) de criaturas.');
    }
    return dados;
  }

  // Estágio (1 a 3) e forma anterior, a partir da cadeia de evolução da lista.
  function calcularCadeia(especies) {
    var pai = {};
    especies.forEach(function (p) {
      listaEvolucoes(p).forEach(function (e) {
        if (e && e.para) pai[e.para] = p.nome;
      });
    });
    var estagios = {};
    function estagioDe(nome, guarda) {
      if (estagios[nome]) return estagios[nome];
      if (!pai[nome] || guarda > 5) return 1;
      return Math.min(3, estagioDe(pai[nome], guarda + 1) + 1);
    }
    especies.forEach(function (p) {
      estagios[p.nome] = estagioDe(p.nome, 0);
    });
    estado.estagios = estagios;
    estado.anteriores = pai;
  }

  // Slots de uma forma evoluída (atributos = null): não há número no dado, então vem do estágio
  // da forma (seção 5): inicial 2, intermediária 3, última evolução 4, sem evolução 4.
  function slotsDerivados(p) {
    var temEvolucao = listaEvolucoes(p).length > 0;
    var temAnterior = !!estado.anteriores[p.nome];
    if (temAnterior) return temEvolucao ? 3 : 4;
    return temEvolucao ? 2 : 4;
  }

  // Atributos da forma para desenhar. Forma evoluída (atributos null) vem com base 0 e
  // "herdado" = true: as caixas saem vazias, porque o valor é herdado na evolução.
  function atributosDaForma(p) {
    var saida = {};
    ORDEM_ATRIBUTOS.forEach(function (chave) {
      var a = p.atributos && p.atributos[chave] ? p.atributos[chave] : null;
      if (a) {
        saida[chave] = { base: Math.max(0, Number(a.base) || 0), slots: inteiro(a.slots, 0), herdado: false };
      } else {
        saida[chave] = { base: 0, slots: slotsDerivados(p), herdado: true };
      }
    });
    return saida;
  }

  function assinatura(p) {
    var dados = (p.golpes || []).map(function (g) { return g.dado + '/' + (g.efeito || '') + '/' + (g.area ? 'a' : ''); }).join(',');
    var atr = ORDEM_ATRIBUTOS.map(function (k) {
      var a = p.atributos && p.atributos[k];
      return a ? Number(a.base) + '/' + Number(a.slots) : 'herda';
    }).join(',');
    return dados + '|' + atr;
  }

  // Confere a carta contra a seção 4 (trilho) e a seção 2 (dados), e o critério 5 (perfil).
  function validarCarta(p, porNome) {
    var problemas = SelecaoImpressao.validarEstruturaTrilho(p);

    var golpes = p.golpes || [];
    if (golpes.length !== GOLPES) problemas.push(golpes.length + ' golpes (esperado ' + GOLPES + ')');
    if (inteiro(p.vida, 0) > VIDA_MAX) problemas.push('vida ' + p.vida + ' não cabe nas 2 linhas de corações (máximo ' + VIDA_MAX + ')');
    golpes.map(ApresentacaoCarta.normalizarGolpe).forEach(function (g) {
      ApresentacaoCarta.problemasGolpe(g).forEach(function (m) { problemas.push('golpe ' + m); });
    });

    var anterior = porNome[estado.anteriores[p.nome]];
    if (anterior && assinatura(anterior) === assinatura(p)) {
      problemas.push('mesmo perfil de dados e atributos que a forma anterior');
    }
    return problemas;
  }

  // ---------------------------------------------------------------- carta: frente

  // Dado do golpe: notação textual direta (d4, d6, d8 ou d12). Suporte (dado null) fica sem dado.
  function montarDado(g) {
    var caixa = el('span', 'golpe-dado');
    var rotulo = ApresentacaoCarta.rotuloDado(g.dado);
    if (rotulo) caixa.textContent = rotulo;
    else if (g.dado !== null) console.warn(g.nome + ': dado ' + g.dado + ' não é válido (d4, d6, d8 ou d12).');
    return caixa;
  }

  // Atributo somado ao dado: "+" e o ícone do atributo (Força ou Energia). Suporte não tem.
  function montarSoma(g) {
    var soma = el('span', 'golpe-soma');
    if (g.dado === null) return soma;
    if (g.atributo !== 'forca' && g.atributo !== 'energia') {
      console.warn(g.nome + ': atributo ' + g.atributo + ' (forca ou energia).');
      return soma;
    }
    soma.append(icone('simbolo', 'mais', 'golpe-mais'), icone('atributo', g.atributo, 'golpe-atributo'));
    return soma;
  }

  // Chips de resistência: até 3, vulneráveis primeiro. O resto fica na ficha da legenda.
  // Ficam no canto inferior direito da imagem (sobre a arte), sem ocupar linha própria.
  function montarChips(caixa, p) {
    var mapa = p.resistencias || {};
    var entradas = Object.keys(mapa)
      .filter(function (tipo) { return PRIORIDADE_EFEITO[mapa[tipo]] !== undefined; })
      .map(function (tipo) { return { tipo: tipo, efeito: mapa[tipo] }; })
      .sort(function (a, b) { return PRIORIDADE_EFEITO[a.efeito] - PRIORIDADE_EFEITO[b.efeito]; });
    entradas.slice(0, MAX_CHIPS).forEach(function (e) {
      var chip = el('span', 'efeito');
      chip.setAttribute('aria-label', e.tipo + ': ' + e.efeito);
      var disco = el('span', 'tipo-disc');
      disco.style.setProperty('--cor-tipo', corTipo(e.tipo));
      disco.append(icone('tipo', e.tipo));
      chip.append(disco, icone('efeito', e.efeito, 'efeito-acao'));
      caixa.append(chip);
    });
  }

  function montarFrente(p, habLib) {
    var card = el('article', 'card frente');
    card.setAttribute('aria-label', p.nome || 'Criatura');
    var principal = (p.tipos || []).filter(Boolean)[0] || 'normal';
    card.style.setProperty('--cor-tipo-principal', corTipo(principal));

    // 1. topo: imagem (40% da altura da carta), com a faixa do nome por cima
    var topo = el('div', 'topo');
    var imagem = el('div', 'imagem');
    var src = caminhoImagem(p.imagem);
    if (src) {
      var img = el('img');
      img.alt = '';
      img.src = src;
      img.style.setProperty('--escala-imagem', EscalaImagens.obter(p));
      img.addEventListener('error', function () {
        this.replaceWith(el('span', 'falta'));
      });
      imagem.append(img);
    } else {
      imagem.append(el('span', 'falta'));
    }
    var nome = el('h2', 'nome', p.nome || '');
    var tiposCabecalho = el('div', 'tipos-cabecalho');
    var tiposVisiveis = ApresentacaoCarta.tiposCabecalho(p.tipos);
    tiposCabecalho.setAttribute('aria-label', 'Tipos: ' + tiposVisiveis.join(', '));
    tiposVisiveis.forEach(function (t) {
      var disco = el('span', 'tipo-disc');
      disco.style.setProperty('--cor-tipo', corTipo(t));
      disco.append(icone('tipo', t));
      tiposCabecalho.append(disco);
    });
    var estagio = estado.estagios[p.nome] || 1;
    var pips = el('div', 'estagio');
    pips.setAttribute('aria-label', 'Estágio ' + estagio);
    for (var s = 1; s <= 3; s++) {
      pips.append(el('span', 'pip' + (s <= estagio ? '' : ' vazio')));
    }
    // resistências: canto inferior direito da imagem, sobre a arte (não ocupam linha)
    var efeitos = el('div', 'efeitos');
    montarChips(efeitos, p);
    topo.append(imagem, nome, tiposCabecalho, pips, efeitos);

    var corpo = el('div', 'corpo');

    // 2. linha: vida (corações de 1 cm, 8 por linha, até 2 linhas)
    var linha = el('div', 'linha-vida');
    var vida = inteiro(p.vida, 0);
    var coracoes = el('div', 'vida');
    coracoes.setAttribute('aria-label', 'Vida ' + vida);
    // até VIDA_MAX corações cabem nas 2 linhas; acima disso a carta é avisada na validação
    for (var i = 0; i < Math.min(vida, VIDA_MAX); i++) {
      coracoes.append(icone('geral', 'coracao', 'coracao'));
    }
    if (vida > VIDA_MAX) console.warn(p.nome + ': vida ' + vida + ' não cabe nas 2 linhas de corações (máximo ' + VIDA_MAX + ').');
    linha.append(coracoes);

    // 3. atributos: uma coluna por atributo, ícone e caixas (sem número).
    // Forma evoluída: caixas vazias (herdado). Forma base: caixas pintadas pela base.
    var atributos = el('div', 'atributos');
    var valores = atributosDaForma(p);
    ORDEM_ATRIBUTOS.forEach(function (chave) {
      var a = valores[chave];
      var coluna = el('div', 'atributo' + (a.herdado ? ' herdado' : ''));
      coluna.append(icone('atributo', chave, 'atributo-icone'));
      var caixas = el('div', 'caixas');
      var ligadas = Math.min(a.base, a.slots);
      for (var j = 0; j < a.slots; j++) {
        var caixa = el('span', 'caixa');
        if (j < ligadas) caixa.classList.add('ligada');
        caixas.append(caixa);
      }
      coluna.append(caixas);
      atributos.append(coluna);
    });

    // 4. golpes: quadrado de liberação (vazio ou marcado), ícone, nome, dado e bolinhas de uso
    var golpes = el('div', 'golpes');
    (p.golpes || []).slice(0, GOLPES).map(ApresentacaoCarta.normalizarGolpe).forEach(function (g, idx) {
      var liberado = idx < habLib;
      var linhaGolpe = el('div', 'golpe' + (liberado ? '' : ' nao-liberado'));
      var marca = el('span', 'golpe-marca');
      if (liberado) marca.append(icone('geral', 'marcado', 'marca-icone'));
      var caixa = el('span', 'golpe-caixa');
      caixa.style.setProperty('--cor-tipo-golpe', corTipo(g.elemento));
      // cargas: 3, 2 ou 1 bolinhas; ilimitado (null) sem bolinhas
      var usos = el('span', 'golpe-usos');
      var cargas = ApresentacaoCarta.problemasGolpe(g).length ? 0 : inteiro(g.cargas, 0);
      for (var k = 0; k < Math.min(cargas, 3); k++) usos.append(el('span', 'bolinha'));
      var efeito = el('span', 'golpe-efeito');
      if (g.efeito) efeito.append(icone('efeito', g.efeito, 'golpe-efeito-icone'));
      var area = el('span', 'golpe-area');
      if (g.area) area.append(icone('geral', 'area', 'golpe-area-icone'));
      // ordem: ícone do golpe (foco), nome, dado, + atributo, efeito, área, bolinhas de carga
      caixa.append(
        icone('golpe', g.icone, 'golpe-icone'),
        el('span', 'golpe-nome', g.nome),
        montarDado(g),
        montarSoma(g),
        efeito,
        area,
        usos
      );
      linhaGolpe.append(marca, caixa);
      golpes.append(linhaGolpe);
    });

    corpo.append(linha, atributos, golpes);
    card.append(topo, corpo);
    return card;
  }

  // ---------------------------------------------------------------- carta: verso

  // Verso: só o trilho de 70 quadradinhos, em 7 colunas por 10 linhas.
  function montarVerso(p) {
    var card = el('article', 'card verso');
    card.setAttribute('aria-label', 'Verso de ' + (p.nome || 'criatura'));

    var marcas = new Map();
    (p.trilho || []).forEach(function (m) { marcas.set(Number(m.pos), m); });
    var inicio = inteiro(p.inicio, 1) || 1;
    var evolucoes = listaEvolucoes(p);

    var trilho = el('div', 'trilho');
    CONFIG_TRILHO.posicoes.forEach(function (pos) {
      var quadrado = el('span', 'quadrado');
      if (pos === inicio) quadrado.classList.add('proximo');
      var m = marcas.get(pos);
      if (m) {
        quadrado.classList.add(m.tipo);
        quadrado.append(icone('trilho', m.tipo, 'trilho-icone'));
        var evo = evolucoes.find(function (e) { return Number(e.pos) === pos && e.requisito; });
        if (evo) quadrado.append(icone('geral', 'item', 'item-icone'));
      }
      trilho.append(quadrado);
    });
    card.append(trilho);
    return card;
  }

  // ---------------------------------------------------------------- folhas

  function montarFolha(numero, grupo, lado, habLib) {
    var folha = el('section', 'pagina folha-' + lado);
    folha.id = 'folha-' + numero + '-' + lado;
    folha.setAttribute('aria-label', 'Folha ' + numero + ', ' + (lado === 'frente' ? 'frente' : 'verso'));
    var cartas = lado === 'verso' ? SelecaoImpressao.espelharVerso(grupo) : grupo;
    for (var i = 0; i < POR_PAGINA; i++) {
      var slot = el('div', 'slot');
      var carta = cartas[i];
      if (carta) {
        slot.append(lado === 'frente' ? montarFrente(carta, habLib) : montarVerso(carta));
      }
      folha.append(slot);
    }
    return folha;
  }

  function desenhar() {
    var especies = SelecaoImpressao.filtrar(estado.especies, estado.idsSelecionados);
    var grupos = SelecaoImpressao.agrupar(especies, POR_PAGINA);

    var lugar = document.getElementById('paginas');
    lugar.textContent = '';
    grupos.forEach(function (grupo, idx) {
      var n = idx + 1;
      lugar.append(el('p', 'rotulo-folha', 'Folha ' + n + ' · frente'));
      lugar.append(montarFolha(n, grupo, 'frente', estado.habilidadesLiberadas));
      lugar.append(el('p', 'rotulo-folha', 'Folha ' + n + ' · verso (imprime no outro lado desta folha)'));
      lugar.append(montarFolha(n, grupo, 'verso', estado.habilidadesLiberadas));
    });

    // seletor de folha
    var seletor = document.getElementById('seletor-pagina');
    var escolhida = seletor.value;
    seletor.textContent = '';
    grupos.forEach(function (grupo, idx) {
      var nomes = grupo.map(function (p) { return p.nome; }).join(', ');
      if (nomes.length > 50) nomes = nomes.slice(0, 47) + '…';
      var opcao = el('option', null, 'Folha ' + (idx + 1) + ': ' + nomes);
      opcao.value = String(idx + 1);
      seletor.append(opcao);
    });
    if (escolhida && seletor.querySelector('option[value="' + escolhida + '"]')) {
      seletor.value = escolhida;
    }
    seletor.disabled = grupos.length === 0;

    var resumo = SelecaoImpressao.resumir(especies.length, estado.especies.length, POR_PAGINA);
    document.getElementById('resumo').textContent = resumo.texto;
    document.getElementById('resumo-selecao').textContent = resumo.selecao;
    document.getElementById('botao-imprimir').disabled = resumo.impressaoDesativada;

    var aviso = document.getElementById('aviso-trilho');
    if (estado.fora.length) {
      aviso.textContent = estado.fora.length + (estado.fora.length === 1 ? ' carta' : ' cartas') + ' fora da regra';
      aviso.title = estado.fora.join('\n');
      aviso.hidden = false;
    } else {
      aviso.hidden = true;
    }
  }

  function montarSeletorCriaturas() {
    var lista = document.getElementById('lista-criaturas');
    lista.textContent = '';
    estado.especies.forEach(function (p) {
      var rotulo = el('label', 'opcao-criatura');
      rotulo.dataset.id = String(p.id);
      rotulo.dataset.nome = p.nome;
      var caixa = el('input');
      caixa.type = 'checkbox';
      caixa.value = String(p.id);
      caixa.checked = estado.idsSelecionados.has(Number(p.id));
      var numero = el('span', 'numero-criatura', '#' + String(p.id).padStart(3, '0'));
      rotulo.append(caixa, numero, el('span', 'nome-criatura', p.nome));
      lista.append(rotulo);
    });
  }

  function atualizarCaixas() {
    document.querySelectorAll('#lista-criaturas input[type="checkbox"]').forEach(function (caixa) {
      caixa.checked = estado.idsSelecionados.has(Number(caixa.value));
    });
  }

  function ligarControles() {
    var seletorPagina = document.getElementById('seletor-pagina');
    seletorPagina.addEventListener('change', function () {
      var alvo = document.getElementById('folha-' + seletorPagina.value + '-frente');
      if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    var seletorHab = document.getElementById('seletor-habilidades');
    seletorHab.value = String(estado.habilidadesLiberadas);
    seletorHab.addEventListener('change', function () {
      estado.habilidadesLiberadas = Number(seletorHab.value) || 1;
      desenhar();
    });

    document.getElementById('botao-imprimir').addEventListener('click', function () {
      window.print();
    });

    document.getElementById('lista-criaturas').addEventListener('change', function (evento) {
      if (!evento.target.matches('input[type="checkbox"]')) return;
      var id = Number(evento.target.value);
      if (evento.target.checked) estado.idsSelecionados.add(id);
      else estado.idsSelecionados.delete(id);
      desenhar();
    });

    document.getElementById('busca-criatura').addEventListener('input', function (evento) {
      var busca = evento.target.value;
      document.querySelectorAll('.opcao-criatura').forEach(function (opcao) {
        opcao.hidden = !SelecaoImpressao.correspondeBusca(
          { id: Number(opcao.dataset.id), nome: opcao.dataset.nome },
          busca
        );
      });
    });

    document.getElementById('selecionar-todos').addEventListener('click', function () {
      estado.idsSelecionados = SelecaoImpressao.selecionarTodos(estado.especies);
      atualizarCaixas();
      desenhar();
    });

    document.getElementById('limpar-selecao').addEventListener('click', function () {
      estado.idsSelecionados.clear();
      atualizarCaixas();
      desenhar();
    });
  }

  function checarCartas(especies) {
    estado.fora = [];
    var porNome = {};
    especies.forEach(function (p) { porNome[p.nome] = p; });
    especies.forEach(function (p) {
      var problemas = validarCarta(p, porNome);
      if (problemas.length) {
        var linha = p.nome + ': ' + problemas.join('; ');
        estado.fora.push(linha);
        console.warn('Carta fora da regra -> ' + linha);
      }
    });
  }

  async function iniciar() {
    var url = '';
    ligarControles();
    try {
      var fonte = await CenarioWeb.fonteDados();
      url = fonte.url;
      prefixoImagem = fonte.prefixoImagem;
      var especies = await carregarDados(url);
      if (!especies.length) {
        mensagem('O arquivo ' + url + ' não tem nenhuma criatura ainda.');
        return;
      }
      estado.especies = especies;
      estado.idsSelecionados = SelecaoImpressao.selecionarTodos(especies);
      calcularCadeia(especies);
      checarCartas(especies);
      esconderMensagem();
      montarSeletorCriaturas();
      desenhar();
      document.getElementById('selecionar-todos').disabled = false;
      document.getElementById('limpar-selecao').disabled = false;
    } catch (e) {
      mensagem(e.message);
      document.getElementById('resumo').textContent = '';
    }
  }

  iniciar();
})();
