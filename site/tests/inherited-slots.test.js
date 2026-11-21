'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inheritedSlots } = require('../card-view');

test('evolved cards leave room for inheritance and their own growth', () => {
  const root = { name: 'Root', attributes: { strength: { base: 2, slots: 5 } }, evolutions: [{ into: 'Next', pos: 20 }], track: [
    { pos: 2, kind: 'star' }, { pos: 4, kind: 'star' }, { pos: 6, kind: 'star' },
    { pos: 8, kind: 'star' }, { pos: 9, kind: 'strength' }, { pos: 21, kind: 'strength' }
  ] };
  const evolved = { name: 'Next', inherits_attributes: true, track: [{ pos: 40, kind: 'strength' }] };
  assert.equal(inheritedSlots(evolved, [root, evolved], 'strength'), 10);
  assert.equal(inheritedSlots(evolved, [evolved], 'strength'), null);
});
