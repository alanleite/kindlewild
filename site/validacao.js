#!/usr/bin/env node
'use strict';

let falhas = 0;
function teste(nome, fn) {
  try {
    fn();
    console.log(`OK    ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`FALHA ${nome}: ${erro.message}`);
  }
}
function afirmar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

teste('A escala visual usa o campo escala_imagem da criatura e vale 1 sem ele', () => {
  const escala = require('./escala-imagens');
  afirmar(escala.obter({ id: 1 }) === 1, 'sem escala_imagem deveria ser 1');
  afirmar(escala.obter(null) === 1, 'sem criatura deveria ser 1');
  afirmar(escala.obter({ escala_imagem: 1.07 }) === 1.07, 'deveria usar o campo escala_imagem');
  afirmar(escala.obter({ escala_imagem: 2 }) === escala.teto, 'deveria limitar ao teto');
});

teste('A escala visual das criaturas do cenário fica no limite seguro', () => {
  const escala = require('./escala-imagens');
  const criaturas = require('../lib/cenario').criaturas();
  for (const c of criaturas) {
    const fator = escala.obter(c);
    afirmar(fator >= 1 && fator <= 1.18, `${c.nome} tem fator inseguro ${fator}`);
    if (c.escala_imagem !== undefined) afirmar(c.escala_imagem <= 1.18, `${c.nome}: escala_imagem acima do teto`);
  }
});

teste('A impressão contém somente as criaturas marcadas, na ordem do número', () => {
  let selecao;
  try {
    selecao = require('./selecao-impressao');
  } catch (_) {
    afirmar(false, 'módulo de seleção para impressão ainda não existe');
  }
  const especies = [
    { id: 3, nome: 'Forma Final' },
    { id: 1, nome: 'Forma Inicial' },
    { id: 2, nome: 'Forma Media' }
  ];
  const resultado = selecao.filtrar(especies, new Set([1, 3]));
  afirmar(resultado.length === 2, `esperava 2 selecionados, recebeu ${resultado.length}`);
  afirmar(resultado[0].id === 1 && resultado[1].id === 3, 'a seleção perdeu a ordem do número');
});

teste('A busca reconhece nome, número simples, número preenchido e número com cerquilha', () => {
  let selecao;
  try {
    selecao = require('./selecao-impressao');
  } catch (_) {
    afirmar(false, 'módulo de seleção para impressão ainda não existe');
  }
  const faiscote = { id: 25, nome: 'Faiscote' };
  for (const termo of ['faiscote', '25', '025', '#025']) {
    afirmar(selecao.correspondeBusca(faiscote, termo), `a busca não reconheceu ${termo}`);
  }
  afirmar(!selecao.correspondeBusca(faiscote, 'brasa'), 'a busca aceitou um nome diferente');
});

teste('Todas as criaturas começam selecionadas uma única vez', () => {
  let selecao;
  try {
    selecao = require('./selecao-impressao');
  } catch (_) {
    afirmar(false, 'módulo de seleção para impressão ainda não existe');
  }
  const ids = selecao.selecionarTodos([{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }]);
  afirmar(ids instanceof Set, 'a seleção inicial precisa ser um Set');
  afirmar(ids.size === 3 && ids.has(1) && ids.has(2) && ids.has(3), 'a seleção inicial não contém todos os IDs únicos');
});

teste('O estado vazio desativa a impressão e o estado parcial conta as folhas', () => {
  let selecao;
  try {
    selecao = require('./selecao-impressao');
  } catch (_) {
    afirmar(false, 'módulo de seleção para impressão ainda não existe');
  }
  const vazio = selecao.resumir(0, 151, 4);
  afirmar(vazio.impressaoDesativada, 'a impressão deveria estar desativada sem cartas');
  afirmar(vazio.folhas === 0 && vazio.texto === '0 selecionados · nenhuma folha', 'o resumo vazio está incorreto');
  const parcial = selecao.resumir(5, 151, 4);
  afirmar(!parcial.impressaoDesativada, 'a impressão deveria estar liberada com cartas');
  afirmar(parcial.folhas === 2 && parcial.texto === '5 selecionados · 2 folhas de frente e verso', 'o resumo parcial está incorreto');
});

teste('A quinta carta inicia uma segunda folha de impressão', () => {
  let selecao;
  try {
    selecao = require('./selecao-impressao');
  } catch (_) {
    afirmar(false, 'módulo de seleção para impressão ainda não existe');
  }
  const cartas = [1, 2, 3, 4, 5].map((id) => ({ id }));
  const folhas = selecao.agrupar(cartas, 4);
  afirmar(folhas.length === 2, `esperava 2 folhas, recebeu ${folhas.length}`);
  afirmar(folhas[0].length === 4 && folhas[1].length === 1, 'as cartas não foram agrupadas em 4 + 1');
});

teste('O verso espelha as colunas e permanece atrás da frente correspondente', () => {
  let selecao;
  try {
    selecao = require('./selecao-impressao');
  } catch (_) {
    afirmar(false, 'módulo de seleção para impressão ainda não existe');
  }
  const frente = [{ id: 25 }, { id: 26 }, { id: 27 }];
  const verso = selecao.espelharVerso(frente);
  afirmar(verso.length === 4, `o verso precisa manter 4 posições, recebeu ${verso.length}`);
  afirmar(verso[0].id === 26 && verso[1].id === 25, 'a primeira linha do verso não foi espelhada');
  afirmar(verso[2] === undefined && verso[3].id === 27, 'a posição vazia não foi espelhada com a terceira carta');
});

teste('O verso impresso usa o trilho atual de 70 casas em uma grade 7 por 10', () => {
  let selecao;
  try {
    selecao = require('./selecao-impressao');
  } catch (_) {
    afirmar(false, 'módulo de seleção para impressão ainda não existe');
  }
  const trilho = selecao.configuracaoTrilho();
  afirmar(trilho.tamanho === 70, `esperava 70 casas, recebeu ${trilho.tamanho}`);
  afirmar(trilho.colunas === 7 && trilho.linhas === 10, 'o trilho precisa ser organizado em 7 colunas por 10 linhas');
  afirmar(trilho.posicoes.length === 70, `esperava 70 posições, recebeu ${trilho.posicoes.length}`);
  afirmar(trilho.posicoes[0] === 1 && trilho.posicoes[69] === 70, 'as posições precisam cobrir o intervalo de 1 a 70');
});

teste('A validação estrutural aceita intervalos longos e evolução antes do terço final', () => {
  const selecao = require('./selecao-impressao');
  const problemas = selecao.validarEstruturaTrilho({
    trilho: [
      { pos: 1, tipo: 'habilidade' },
      { pos: 2, tipo: 'coracao' },
      { pos: 3, tipo: 'estrela' },
      { pos: 6, tipo: 'forca' },
      { pos: 32, tipo: 'evolucao' },
      { pos: 70, tipo: 'poder' }
    ]
  });
  afirmar(problemas.length === 0, `a trilha válida recebeu avisos obsoletos: ${problemas.join('; ')}`);
});

teste('A validação estrutural rejeita posições repetidas ou fora das 70 casas', () => {
  const selecao = require('./selecao-impressao');
  const problemas = selecao.validarEstruturaTrilho({
    trilho: [
      { pos: 3, tipo: 'estrela' },
      { pos: 3, tipo: 'forca' },
      { pos: 71, tipo: 'coracao' }
    ]
  });
  afirmar(problemas.includes('posição repetida'), 'a posição repetida não foi detectada');
  afirmar(problemas.includes('marca fora da posição 1 a 70'), 'a posição fora do trilho não foi detectada');
});

teste('Os dados válidos aparecem como notação textual simples', () => {
  let apresentacao;
  try {
    apresentacao = require('./apresentacao-carta');
  } catch (_) {
    afirmar(false, 'módulo de apresentação da carta ainda não existe');
  }
  afirmar(apresentacao.rotuloDado('d4') === 'd4', 'd4 não foi preservado');
  afirmar(apresentacao.rotuloDado('d6') === 'd6', 'd6 não foi preservado');
  afirmar(apresentacao.rotuloDado('d8') === 'd8', 'd8 não foi preservado');
  afirmar(apresentacao.rotuloDado('d12') === 'd12', 'd12 não foi preservado');
  afirmar(apresentacao.rotuloDado('d10') === null, 'd10 não deveria ser aceito pelas regras atuais');
  for (const invalido of ['toString', 'constructor', '__proto__', '', null, 4]) {
    afirmar(apresentacao.rotuloDado(invalido) === null, `${String(invalido)} não deveria ser aceito como dado`);
  }
});

teste('O cabeçalho recebe no máximo os dois primeiros tipos válidos', () => {
  let apresentacao;
  try {
    apresentacao = require('./apresentacao-carta');
  } catch (_) {
    afirmar(false, 'módulo de apresentação da carta ainda não existe');
  }
  const tipos = apresentacao.tiposCabecalho(['agua', '', null, 'gelo', 'voador']);
  afirmar(tipos.length === 2, `esperava 2 tipos, recebeu ${tipos.length}`);
  afirmar(tipos[0] === 'agua' && tipos[1] === 'gelo', 'os tipos válidos perderam a ordem');
});

teste('Golpe antigo é normalizado e golpe de suporte é validado', () => {
  const ap = require('./apresentacao-carta');
  const velho = ap.normalizarGolpe({ nome: 'A', tipo: 'fogo', categoria: 'elemental', dado: 'd6', usos: 2 });
  afirmar(velho.elemento === 'fogo' && velho.atributo === 'energia' && velho.cargas === 2, 'formato antigo mal convertido');
  const suporte = ap.normalizarGolpe({ nome: 'S', elemento: 'normal', atributo: null, dado: null, cargas: 2, efeito: 'sono', area: false });
  afirmar(ap.problemasGolpe(suporte).length === 0, 'suporte válido recebeu problemas');
  afirmar(ap.problemasGolpe(ap.normalizarGolpe({ nome: 'X', dado: null, atributo: null })).length === 1, 'suporte sem efeito deveria ser apontado');
});

teste('Uma criatura pode ter vários marcos de evolução na posição 40, e só nela', () => {
  const selecao = require('./selecao-impressao');
  afirmar(selecao.validarEstruturaTrilho({ trilho: [{ pos: 40, tipo: 'evolucao' }, { pos: 40, tipo: 'evolucao' }] }).length === 0, 'repetição em 40 deveria passar');
  afirmar(selecao.validarEstruturaTrilho({ trilho: [{ pos: 41, tipo: 'evolucao' }, { pos: 41, tipo: 'evolucao' }] }).includes('posição repetida'), 'repetição fora de 40 deveria falhar');
});

console.log('');
console.log(falhas === 0 ? 'Todos os testes do site passaram.' : `${falhas} teste(s) falharam.`);
if (falhas > 0) process.exitCode = 1;
