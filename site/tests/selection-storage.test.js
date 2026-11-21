'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const selection = require('../print-selection');

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('selection is saved per database, including an empty selection', () => {
  const db = storage(), creatures = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual([...selection.restore(db, 'a', creatures)], [1, 2, 3]);
  selection.save(db, 'a', new Set([1, 3, 99]));
  assert.deepEqual([...selection.restore(db, 'a', creatures)], [1, 3]);
  assert.deepEqual([...selection.restore(db, 'b', creatures)], [1, 2, 3]);
  selection.save(db, 'a', new Set());
  assert.deepEqual([...selection.restore(db, 'a', creatures)], []);
});

test('unavailable or malformed storage falls back safely', () => {
  const creatures = [{ id: 1 }];
  const unavailable = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.deepEqual([...selection.restore(unavailable, 'a', creatures)], [1]);
  assert.equal(selection.save(unavailable, 'a', new Set([1])), false);
  assert.deepEqual([...selection.restore({ getItem: () => '["bad"]' }, 'a', creatures)], [1]);
});
