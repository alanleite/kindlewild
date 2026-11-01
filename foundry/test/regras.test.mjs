import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../module/regras.mjs';

const marcas = [{ pos: 5, tipo: 'coracao' }, { pos: 20, tipo: 'coracao' }, { pos: 30, tipo: 'estrela' }];

test('vidaMaxima soma corações até o progresso, teto 16', () => {
  assert.equal(R.vidaMaxima(8, marcas, 0), 8);
  assert.equal(R.vidaMaxima(8, marcas, 5), 9);
  assert.equal(R.vidaMaxima(8, marcas, 70), 10);
  assert.equal(R.vidaMaxima(15, marcas, 70), 16);
});

test('vidaMaxima cai quando o progresso volta (Review Focus)', () => {
  assert.equal(R.vidaMaxima(8, marcas, 19), 9);
});

test('descanso recupera metade do máximo, arredondado pra cima', () => {
  assert.equal(R.descanso(2, 10), 7);
  assert.equal(R.descanso(2, 7), 6);
  assert.equal(R.descanso(9, 10), 10);
});

test('proximoValorClique: clicar no último marcado desmarca, além dele marca até ali', () => {
  assert.equal(R.proximoValorClique(5, 5, 8), 4);
  assert.equal(R.proximoValorClique(5, 3, 8), 2);
  assert.equal(R.proximoValorClique(5, 7, 8), 7);
  assert.equal(R.proximoValorClique(5, 9, 8), 8);
});

test('ehIlimitado e podeUsar', () => {
  const g1 = { ordem: 1, liberado: true, cargas: { valor: 0, max: 2 } };
  const g2 = { ordem: 2, liberado: true, cargas: { valor: 0, max: 2 } };
  const g3 = { ordem: 3, liberado: false, cargas: { valor: 2, max: 2 } };
  assert.equal(R.ehIlimitado(g1), true);
  assert.deepEqual(R.podeUsar(g1), { ok: true, motivo: null });
  assert.deepEqual(R.podeUsar(g2), { ok: false, motivo: 'sem-carga' });
  assert.deepEqual(R.podeUsar(g3), { ok: false, motivo: 'bloqueado' });
});

test('formulaDano: dado + estrelas do atributo; suporte não tem fórmula', () => {
  const atr = { forca: { estrelas: 2 }, energia: { estrelas: 0 } };
  assert.equal(R.formulaDano({ dado: 'd6', atributo: 'forca' }, atr), '1d6 + 2');
  assert.equal(R.formulaDano({ dado: 'd12', atributo: 'energia' }, atr), '1d12 + 0');
  assert.equal(R.formulaDano({ dado: null, atributo: null }, atr), null);
});

test('referenciaAlvo: sem alvo e sem resistência mostram traço', () => {
  assert.deepEqual(R.referenciaAlvo(null, 'fogo'), { agilidade: '—', defesa: '—', resistencia: '—' });
  const alvo = { atributos: { agilidade: { estrelas: 11 }, defesa: { estrelas: 3 } }, resistencias: { agua: 'vulneravel' } };
  assert.deepEqual(R.referenciaAlvo(alvo, 'fogo'), { agilidade: '8', defesa: '3', resistencia: '—' });
  assert.deepEqual(R.referenciaAlvo(alvo, 'agua'), { agilidade: '8', defesa: '3', resistencia: 'vulneravel' });
});

test('vidaAposProgresso limita a vida salva ao novo máximo (revisão #2)', () => {
  assert.equal(R.vidaAposProgresso(8, marcas, 4, 10), 8);
  assert.equal(R.vidaAposProgresso(8, marcas, 20, 3), 3);
});
