import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../module/rules.mjs';

const marks = [{ pos: 5, kind: 'heart' }, { pos: 20, kind: 'heart' }, { pos: 30, kind: 'star' }];

test('maxHealth adds hearts up to the progress, capped at 24', () => {
  assert.equal(R.maxHealth(8, marks, 0), 8);
  assert.equal(R.maxHealth(8, marks, 5), 9);
  assert.equal(R.maxHealth(8, marks, 70), 10);
  assert.equal(R.maxHealth(15, marks, 70), 17);
  assert.equal(R.maxHealth(23, marks, 70), 24);
});

test('maxHealth drops when the progress goes back (Review Focus)', () => {
  assert.equal(R.maxHealth(8, marks, 19), 9);
});

test('rest recovers half the max, rounded up', () => {
  assert.equal(R.rest(2, 10), 7);
  assert.equal(R.rest(2, 7), 6);
  assert.equal(R.rest(9, 10), 10);
});

test('nextClickValue: clicking the last marked one unmarks it, beyond it marks up to there', () => {
  assert.equal(R.nextClickValue(5, 5, 8), 4);
  assert.equal(R.nextClickValue(5, 3, 8), 2);
  assert.equal(R.nextClickValue(5, 7, 8), 7);
  assert.equal(R.nextClickValue(5, 9, 8), 8);
});

test('isUnlimited and canUse', () => {
  const m1 = { order: 1, unlocked: true, charges: { value: 0, max: 2 } };
  const m2 = { order: 2, unlocked: true, charges: { value: 0, max: 2 } };
  const m3 = { order: 3, unlocked: false, charges: { value: 2, max: 2 } };
  assert.equal(R.isUnlimited(m1), true);
  assert.deepEqual(R.canUse(m1), { ok: true, reason: null });
  assert.deepEqual(R.canUse(m2), { ok: false, reason: 'no-charges' });
  assert.deepEqual(R.canUse(m3), { ok: false, reason: 'locked' });
});

test('damageFormula: die + attribute stars; support has no formula', () => {
  const attrs = { strength: { stars: 2 }, energy: { stars: 0 } };
  assert.equal(R.damageFormula({ die: 'd6', attribute: 'strength' }, attrs), '1d6 + 2');
  assert.equal(R.damageFormula({ die: 'd12', attribute: 'energy' }, attrs), '1d12 + 0');
  assert.equal(R.damageFormula({ die: null, attribute: null }, attrs), null);
  assert.equal(R.damageFormula({ die: 'd6', attribute: 'strength' }, { strength: { base: 2, stars: 3 } }), '1d6 + 5');
});

test('targetReference: no target and no resistance show a dash', () => {
  assert.deepEqual(R.targetReference(null, 'fire'), { agility: '—', defense: '—', resistance: '—' });
  const target = { attributes: { agility: { stars: 11 }, defense: { stars: 3 } }, resistances: { water: 'vulnerable' } };
  assert.deepEqual(R.targetReference(target, 'fire'), { agility: '8', defense: '3', resistance: '—' });
  assert.deepEqual(R.targetReference(target, 'water'), { agility: '8', defense: '3', resistance: 'vulnerable' });
});

test('healthAfterProgress caps saved health at the new max (review #2)', () => {
  assert.equal(R.healthAfterProgress(8, marks, 4, 10), 8);
  assert.equal(R.healthAfterProgress(8, marks, 20, 3), 3);
});
