import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actorId, moveId, creatureToActor } from '../build/converter.mjs';

const move = (name, extra = {}) => ({ name, icon: 'dot', element: 'normal', attribute: 'strength', die: 'd4', charges: null, effect: null, area: false, weight: 1, unlocked_at: 1, ...extra });
const base = {
  id: 1, name: 'Brotinho', types: ['plant', 'poison'], image: 'images/001.png', health: 8, xp: 1,
  attributes: { strength: { base: 0, slots: 2 }, energy: { base: 0, slots: 4 }, agility: { base: 0, slots: 2 }, defense: { base: 0, slots: 4 } },
  evolutions: [{ into: 'Brotao', pos: 32 }],
  track: [{ pos: 1, kind: 'skill', detail: 1 }, { pos: 9, kind: 'heart' }, { pos: 50, kind: 'power', detail: 3 }],
  resistances: { fire: 'vulnerable' },
  moves: [move('Investida'), move('Chicote', { unlocked_at: 2 }), move('Pó do Sono', { die: null, attribute: null, charges: 2, effect: 'sleep', unlocked_at: 3 }), move('Folha', { die: 'd8', charges: 2, unlocked_at: 4 })]
};
const evolved = { ...base, id: 2, name: 'Brotao', image: 'images/002.png', attributes: null, inherits_attributes: true, evolutions: [] };
const all = [base, evolved];
const MOD = 'kindlewild-test';

test('ids have 16 alphanumeric characters', () => {
  assert.equal(actorId(25), 'crit025000000000');
  assert.equal(moveId(25, 3), 'move025300000000');
  assert.match(actorId(151), /^[a-zA-Z0-9]{16}$/);
  assert.match(moveId(151, 4), /^[a-zA-Z0-9]{16}$/);
});

test('creatureToActor builds an actor with embedded moves', () => {
  const a = creatureToActor(base, all, { module: MOD });
  assert.equal(a._id, 'crit001000000000');
  assert.equal(a._key, '!actors!crit001000000000');
  assert.equal(a.type, 'creature');
  assert.equal(a.img, 'modules/kindlewild-test/assets/001.png');
  assert.equal(a.prototypeToken.texture.src, a.img);
  assert.deepEqual(a.system.health, { base: 8, value: 8 });
  assert.deepEqual(a.system.attributes.energy, { base: 0, slots: 4, stars: 0 });
  assert.equal(a.system.track.progress, 0);
  assert.equal(a.system.track.marks[0].detail, '1');
  assert.equal(a.items.length, 4);
  assert.equal(a.items[0]._key, '!actors.items!crit001000000000.move001100000000');
  assert.equal(a.items[0].type, 'move');
  assert.equal(a.items[0].system.unlocked, true);
  assert.equal(a.items[1].system.unlocked, false);
  assert.deepEqual(a.items[2].system.charges, { value: 2, max: 2 });
  assert.deepEqual(a.items[0].system.charges, { value: null, max: null });
  assert.equal(a.items[2].system.die, null);
});

test('evolved form without attributes gets slots from the root (Review Focus)', () => {
  const a = creatureToActor(evolved, all, { module: MOD });
  assert.equal(a.system.inheritsAttributes, true);
  assert.deepEqual(a.system.attributes.defense, { base: 0, slots: 4, stars: 0 });
});

test('token size: small 0.5, medium 1, large 2', () => {
  assert.equal(creatureToActor({ ...base, size: 'small' }, all, { module: MOD }).prototypeToken.width, 0.5);
  assert.equal(creatureToActor({ ...base, size: 'small' }, all, { module: MOD }).prototypeToken.height, 0.5);
  assert.equal(creatureToActor({ ...base, size: 'medium' }, all, { module: MOD }).prototypeToken.width, 1);
  assert.equal(creatureToActor({ ...base, size: 'large' }, all, { module: MOD }).prototypeToken.height, 2);
  assert.equal(creatureToActor(base, all, { module: MOD }).prototypeToken.width, 1);
  assert.equal(creatureToActor({ ...base, size: 'large' }, all, { module: MOD }).system.size, 'large');
});

test('rare comes from the creature field, and the module is required', () => {
  assert.equal(creatureToActor(base, all, { module: MOD }).system.rare, false);
  assert.equal(creatureToActor({ ...base, rare: true }, all, { module: MOD }).system.rare, true);
  assert.throws(() => creatureToActor(base, all), /module/);
});
