const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function carregarIcones() {
  const contexto = { window: {} };
  vm.createContext(contexto);
  const arquivo = path.join(__dirname, '..', 'icones.js');
  vm.runInContext(fs.readFileSync(arquivo, 'utf8'), contexto, { filename: arquivo });
  return contexto.window.ICONES;
}

test('Força usa um desenho geral de mão reconhecível', () => {
  const icones = carregarIcones();
  const mao = icones.obter('geral', 'mao');
  assert.notEqual(mao, icones.placeholder);
  assert.doesNotMatch(mao, /fill="currentColor"|stroke="none"/);
  assert.equal(
    icones.obter('atributo', 'forca'),
    mao
  );
  assert.equal(
    icones.obter('trilho', 'forca'),
    mao
  );
});

test('Agilidade usa o desenho geral de sapato', () => {
  const icones = carregarIcones();
  const sapato = icones.obter('geral', 'sapato');
  assert.notEqual(sapato, icones.placeholder);
  assert.doesNotMatch(sapato, /fill="currentColor"|stroke="none"/);
  assert.doesNotMatch(sapato, /stroke-width="2\.4"/);
  assert.equal(
    icones.obter('atributo', 'agilidade'),
    sapato
  );
});
