import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idAtor, idGolpe, especieParaAtor } from '../build/converter.mjs';

const golpe = (nome, extra = {}) => ({ nome, icone: 'bolinha', elemento: 'normal', atributo: 'forca', dado: 'd4', cargas: null, efeito: null, area: false, peso: 1, liberado_em: 1, ...extra });
const base = {
  id: 1, nome: 'Brotinho', tipos: ['planta', 'veneno'], imagem: 'imagens/001.png', vida: 8, xp: 1,
  atributos: { forca: { base: 0, slots: 2 }, energia: { base: 0, slots: 4 }, agilidade: { base: 0, slots: 2 }, defesa: { base: 0, slots: 4 } },
  evolucao: [{ para: 'Brotao', pos: 32 }],
  trilho: [{ pos: 1, tipo: 'habilidade', detalhe: 1 }, { pos: 9, tipo: 'coracao' }, { pos: 50, tipo: 'poder', detalhe: 3 }],
  resistencias: { fogo: 'vulneravel' },
  golpes: [golpe('Investida'), golpe('Chicote', { liberado_em: 2 }), golpe('Pó do Sono', { dado: null, atributo: null, cargas: 2, efeito: 'sono', liberado_em: 3 }), golpe('Folha', { dado: 'd8', cargas: 2, liberado_em: 4 })]
};
const evoluida = { ...base, id: 2, nome: 'Brotao', imagem: 'imagens/002.png', atributos: null, herda_atributos: true, evolucao: [] };
const todas = [base, evoluida];
const MOD = 'kindlewild-teste';

test('ids têm 16 caracteres alfanuméricos', () => {
  assert.equal(idAtor(25), 'crit025000000000');
  assert.equal(idGolpe(25, 3), 'golp025300000000');
  assert.match(idAtor(151), /^[a-zA-Z0-9]{16}$/);
});

test('especieParaAtor monta ator com golpes embutidos', () => {
  const a = especieParaAtor(base, todas, { modulo: MOD });
  assert.equal(a._id, 'crit001000000000');
  assert.equal(a._key, '!actors!crit001000000000');
  assert.equal(a.type, 'criatura');
  assert.equal(a.img, 'modules/kindlewild-teste/assets/001.png');
  assert.equal(a.prototypeToken.texture.src, a.img);
  assert.deepEqual(a.system.vida, { base: 8, value: 8 });
  assert.deepEqual(a.system.atributos.energia, { slots: 4, estrelas: 0 });
  assert.equal(a.system.trilho.progresso, 0);
  assert.equal(a.system.trilho.marcas[0].detalhe, '1');
  assert.equal(a.items.length, 4);
  assert.equal(a.items[0]._key, '!actors.items!crit001000000000.golp001100000000');
  assert.equal(a.items[0].system.liberado, true);
  assert.equal(a.items[1].system.liberado, false);
  assert.deepEqual(a.items[2].system.cargas, { valor: 2, max: 2 });
  assert.deepEqual(a.items[0].system.cargas, { valor: null, max: null });
  assert.equal(a.items[2].system.dado, null);
});

test('forma evoluída sem atributos recebe slots da raiz (Review Focus)', () => {
  const a = especieParaAtor(evoluida, todas, { modulo: MOD });
  assert.equal(a.system.herdaAtributos, true);
  assert.deepEqual(a.system.atributos.defesa, { slots: 4, estrelas: 0 });
});

test('tamanho do token: pequeno 0,5, médio 1, grande 2', () => {
  assert.equal(especieParaAtor({ ...base, tamanho: 'pequeno' }, todas, { modulo: MOD }).prototypeToken.width, 0.5);
  assert.equal(especieParaAtor({ ...base, tamanho: 'pequeno' }, todas, { modulo: MOD }).prototypeToken.height, 0.5);
  assert.equal(especieParaAtor({ ...base, tamanho: 'medio' }, todas, { modulo: MOD }).prototypeToken.width, 1);
  assert.equal(especieParaAtor({ ...base, tamanho: 'grande' }, todas, { modulo: MOD }).prototypeToken.height, 2);
  assert.equal(especieParaAtor(base, todas, { modulo: MOD }).prototypeToken.width, 1);
  assert.equal(especieParaAtor({ ...base, tamanho: 'grande' }, todas, { modulo: MOD }).system.tamanho, 'grande');
});

test('raro vem do campo da criatura, e o módulo é obrigatório', () => {
  assert.equal(especieParaAtor(base, todas, { modulo: MOD }).system.raro, false);
  assert.equal(especieParaAtor({ ...base, raro: true }, todas, { modulo: MOD }).system.raro, true);
  assert.throws(() => especieParaAtor(base, todas), /módulo/);
});
