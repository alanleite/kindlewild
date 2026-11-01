import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import cenario from '../../lib/cenario.js';
import { gerarFontes, manifestoModulo } from '../build/gerar-compendio.mjs';
import { IMAGEM_PADRAO } from '../build/converter.mjs';

const m = cenario.manifesto();
const dados = cenario.criaturas();
const gerar = () => gerarFontes(dados, m.foundry.modulo);

test('um ator por criatura, 4 golpes cada, ids únicos', () => {
  const fontes = gerar();
  assert.equal(fontes.length, dados.length);
  assert.equal(fontes.reduce((s, a) => s + a.items.length, 0), 4 * dados.length);
  assert.equal(new Set(fontes.map((a) => a._id)).size, dados.length);
  for (const a of fontes) assert.match(a._id, /^[a-zA-Z0-9]{16}$/);
});

test('todas as formas têm slots em todos os atributos', () => {
  for (const a of gerar()) {
    for (const v of Object.values(a.system.atributos)) assert.ok(v.slots >= 1, a.name);
  }
});

test('todas as espécies têm tamanho definido', () => {
  for (const e of dados) assert.ok(['pequeno', 'medio', 'grande'].includes(e.tamanho), e.nome);
});

test('imagens apontam para o módulo do cenário e existem (sem imagem: ícone padrão)', () => {
  const fontes = gerar();
  dados.forEach((e, i) => {
    if (!e.imagem) return assert.equal(fontes[i].img, IMAGEM_PADRAO, e.nome);
    assert.ok(fontes[i].img.startsWith(`modules/${m.foundry.modulo}/assets/`), fontes[i].img);
    assert.ok(existsSync(cenario.caminhoImagem(e)), e.nome);
  });
});

test('manifesto do módulo depende do sistema e declara o compêndio', () => {
  const mod = manifestoModulo(m);
  assert.equal(mod.id, m.foundry.modulo);
  assert.equal(mod.relationships.systems[0].id, 'kindlewild');
  assert.equal(mod.packs[0].system, 'kindlewild');
  assert.equal(mod.packs[0].path, `packs/${m.foundry.pack}`);
  assert.equal(mod.packs[0].type, 'Actor');
});
