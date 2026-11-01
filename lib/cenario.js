// Localiza e carrega um cenário (cenarios/<id>/). O núcleo não conhece nenhum cenário pelo nome:
// o padrão vem de KINDLEWILD_CENARIO ou de cenarios/padrao.txt.
// Convenção de arquivos do cenário: cenario.json (manifesto), criaturas.json (lista) e imagens/.
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PASTA_CENARIOS = path.join(RAIZ, 'cenarios');

function idPadrao() {
  if (process.env.KINDLEWILD_CENARIO) return process.env.KINDLEWILD_CENARIO;
  const arquivo = path.join(PASTA_CENARIOS, 'padrao.txt');
  if (fs.existsSync(arquivo)) return fs.readFileSync(arquivo, 'utf8').trim();
  throw new Error('Nenhum cenário escolhido: defina KINDLEWILD_CENARIO ou crie cenarios/padrao.txt.');
}

function pasta(id = idPadrao()) {
  const dir = path.join(PASTA_CENARIOS, id);
  if (!fs.existsSync(path.join(dir, 'cenario.json'))) throw new Error(`Cenário não encontrado: ${dir}/cenario.json`);
  return dir;
}

function manifesto(id = idPadrao()) {
  return JSON.parse(fs.readFileSync(path.join(pasta(id), 'cenario.json'), 'utf8'));
}

function criaturas(id = idPadrao()) {
  return JSON.parse(fs.readFileSync(path.join(pasta(id), 'criaturas.json'), 'utf8'));
}

// Caminho absoluto da imagem de uma criatura (o campo `imagem` é relativo à pasta do cenário).
function caminhoImagem(criatura, id = idPadrao()) {
  if (!criatura.imagem) return null;
  return path.join(pasta(id), criatura.imagem);
}

module.exports = { RAIZ, PASTA_CENARIOS, idPadrao, pasta, manifesto, criaturas, caminhoImagem };
