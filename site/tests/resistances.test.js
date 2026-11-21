'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('../resistances');

test('normalizes old immunities and limits each group to three', () => {
  const input = { a: 'immune', b: 'resistant', c: 'resistant', d: 'resistant', e: 'vulnerable', f: 'vulnerable', g: 'vulnerable', h: 'vulnerable' };
  assert.deepEqual(normalize(input), { a: 'resistant', b: 'resistant', c: 'resistant', e: 'vulnerable', f: 'vulnerable', g: 'vulnerable' });
});
