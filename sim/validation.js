#!/usr/bin/env node
'use strict';

// Engine validation tests. Usage: node sim/validation.js
// Exits with code 1 if any test fails.

const path = require('path');
const {
  createRng, resolveAttack, computeDamage, hitChance, battle, applyEffect, effectiveAgility, roll,
} = require('./engine');
const { buildSyntheticCard, buildCard, findSpecies, normalizeMove, DEFAULT_DATA } = require('./card');
const { default: defaultPolicy, random } = require('./policy');
const FIXTURES = require(path.join(__dirname, 'fixtures', 'species.json'));

let failures = 0;
function test(name, fn) {
  try {
    const detail = fn();
    console.log(`OK    ${name}${detail ? ` (${detail})` : ''}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const N = 100000;

// Test move: 1d6 + Strength 2, physical, normal type.
function attacker(strength = 2, energy = 0) {
  return buildSyntheticCard({ strength, energy, moves: [{ die: 'd6', attribute: 'strength', element: 'normal' }] });
}

test('1d6 + 2 against Defense 0, no weakness: damage between 3 and 8', () => {
  const rng = createRng(1);
  const a = attacker(2);
  const target = buildSyntheticCard({ agility: 0, defense: 0 });
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolveAttack(a, target, a.moves[0], rng);
    assert(r.hit, 'with Agility 0 it should hit');
    min = Math.min(min, r.damage);
    max = Math.max(max, r.damage);
  }
  assert(min === 3 && max === 8, `min ${min}, max ${max}`);
  return `min ${min}, max ${max}`;
});

test('Defense 10: damage is 0 when the result is negative (no minimum of 1 per hit)', () => {
  const rng = createRng(2);
  const a = attacker(2);
  const target = buildSyntheticCard({ agility: 0, defense: 10 });
  let zeros = 0;
  let others = 0;
  for (let i = 0; i < N; i += 1) {
    const r = resolveAttack(a, target, a.moves[0], rng);
    if (r.damage === 0) zeros += 1;
    else others += 1;
  }
  assert(others === 0, `${others} damage values other than 0 with Defense 10 and maximum 8`);
  // Tie rule: subtotal equal to Defense gives 1. Checked with fixed values.
  assert(computeDamage({ die: 3, attribute: 0, defense: 3 }) === 1, 'zero after Defense should give 1');
  assert(computeDamage({ die: 2, attribute: 0, defense: 3 }) === 0, 'negative after Defense should give 0');
  return `${zeros} zeros in ${N}`;
});

test('Legacy immunity is treated as resistance', () => {
  const rng = createRng(3);
  const a = attacker(5);
  const target = buildSyntheticCard({ agility: 0, defense: 0, resistances: { normal: 'immune' } });
  for (let i = 0; i < N; i += 1) {
    const r = resolveAttack(a, target, a.moves[0], rng);
    assert(r.damage >= 3 && r.damage <= 6, `damage ${r.damage} on resistant target`);
  }
  assert(computeDamage({ die: 6, attribute: 5, effect: 'immune', defense: 0 }) === 6, 'legacy immune should halve damage');
  return 'half damage';
});

test('Vulnerable target ×2, move 1d4 + 0: damage between 2 and 8, minus Defense', () => {
  const rng = createRng(4);
  const a = buildSyntheticCard({ moves: [{ die: 'd4', attribute: 'energy', element: 'electric' }], energy: 0 });
  const target = buildSyntheticCard({ agility: 0, defense: 0, resistances: { electric: 'vulnerable' } });
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolveAttack(a, target, a.moves[0], rng);
    min = Math.min(min, r.damage);
    max = Math.max(max, r.damage);
  }
  assert(min === 2 && max === 8, `min ${min}, max ${max}`);
  // With Defense 1: (1..4)*2 - 1 = 1..7
  const targetDef = buildSyntheticCard({ agility: 0, defense: 1, resistances: { electric: 'vulnerable' } });
  let min2 = Infinity;
  let max2 = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolveAttack(a, targetDef, a.moves[0], rng);
    min2 = Math.min(min2, r.damage);
    max2 = Math.max(max2, r.damage);
  }
  assert(min2 === 1 && max2 === 7, `with Defense 1: min ${min2}, max ${max2}`);
  return `no Defense: ${min}..${max}; Defense 1: ${min2}..${max2}`;
});

test('Target Agility 0: hits 100% of the time', () => {
  const rng = createRng(5);
  const a = attacker(1);
  const target = buildSyntheticCard({ agility: 0 });
  let misses = 0;
  for (let i = 0; i < N; i += 1) {
    if (!resolveAttack(a, target, a.moves[0], rng).hit) misses += 1;
  }
  assert(misses === 0, `${misses} misses in ${N}`);
  return `${N} of ${N}`;
});

test('Target Agility 8: hits 20% (±2 percentage points)', () => {
  const rng = createRng(6);
  const a = attacker(1);
  const target = buildSyntheticCard({ agility: 8 });
  let hits = 0;
  for (let i = 0; i < N; i += 1) {
    if (resolveAttack(a, target, a.moves[0], rng).hit) hits += 1;
  }
  const rate = hits / N;
  assert(Math.abs(rate - 0.2) <= 0.02, `rate ${rate}`);
  return `rate ${(rate * 100).toFixed(2)}%`;
});

test('Hit table: P(d10 > Agility) for 0 to 11', () => {
  const expected = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0, 0];
  expected.forEach((p, ag) => assert(hitChance(ag) === p, `Agility ${ag}`));
  return 'exact';
});

test('Natural attribute points preserve the empty growth boxes', () => {
  const c = JSON.parse(JSON.stringify(FIXTURES.find((s) => s.name === 'Novo')));
  c.attributes.strength = { base: 2, slots: 5 };
  c.attributes.energy = { base: 0, slots: 0 };
  for (let i = 0; i < 8; i++) c.track.push({ pos: 60 + i, kind: 'star' });
  const result = buildCard(c, { progress: 70, stars: 'strength', list: [c] });
  assert(result.attributes.strength.base === 2, 'expected two natural points');
  assert(result.attributes.strength.stars === 3, 'expected three growth boxes');
  return 'two natural points plus three growth boxes';
});

test('Battle: same seed, same result', () => {
  const x = battle(buildSyntheticCard({ health: 5, strength: 2 }), buildSyntheticCard({ health: 5, agility: 2 }), { seed: 99 });
  const y = battle(buildSyntheticCard({ health: 5, strength: 2 }), buildSyntheticCard({ health: 5, agility: 2 }), { seed: 99 });
  assert(JSON.stringify(x) === JSON.stringify(y), 'different results');
  return `winner ${x.winner}`;
});

test('Battle: target with zero health loses and the log exists', () => {
  const r = battle(buildSyntheticCard({ health: 3, strength: 9, agility: 0 }), buildSyntheticCard({ health: 1, agility: 0 }), { seed: 7 });
  assert(r.winner === 'a' && r.reason === 'KO', `winner ${r.winner} reason ${r.reason}`);
  assert(Array.isArray(r.log) && r.log.length > 0, 'empty log');
  return `KO in ${r.turns} turn(s)`;
});

test('Move with no charges left is not chosen', () => {
  const a = buildSyntheticCard({
    strength: 3,
    moves: [{ name: 'Basic', die: 'd4' }, { name: 'Limited', die: 'd8', charges: 1, bonus: 0 }],
  });
  // The limited one is stronger, but has only 1 use.
  const target = buildSyntheticCard({ health: 50, agility: 0 });
  const r = battle(a, target, { seed: 3, maxTurns: 10 });
  const limitedUses = r.log.filter((e) => e.move === 'Limited').length;
  assert(limitedUses === 1, `Limited used ${limitedUses} times`);
  return 'used once';
});

test('Card from data: health = base health + track hearts up to progress; moves unlocked by the track', () => {
  const base = DEFAULT_DATA.find((s) => s.track.some((m) => m.kind === 'heart'));
  const c = buildCard(base, { progress: 70 });
  const hearts = base.track.filter((m) => m.kind === 'heart').length;
  assert(c.maxHealth === Math.min(24, base.health + hearts), `maxHealth ${c.maxHealth}`);
  assert(c.moves.every((m) => m.unlocked), 'not all moves unlocked at 70');
  const c0 = buildCard(base, { progress: 0 });
  assert(c0.maxHealth === base.health && c0.moves.filter((m) => m.unlocked).length === 1, 'progress 0: only move 1');
  return `health ${c.maxHealth}`;
});

test('All species fit the card\'s physical limit of 24 hearts', () => {
  const overLimit = [];
  for (const species of DEFAULT_DATA) {
    if (species.health + species.track.filter(m => m.kind === 'heart').length > 24) overLimit.push(`${species.name} (${species.health})`);
  }
  assert(overLimit.length === 0, `over 24: ${overLimit.join(', ')}`);
  return 'maximum 24';
});

test('Evolution: the evolved form copies the previous form\'s value (no +1) and has a new track', () => {
  const base = DEFAULT_DATA.find((s) => !s.inherits_attributes && (s.evolutions || []).length > 0);
  const evolved = findSpecies(base.evolutions[0].into);
  const cp = buildCard(base, { progress: base.evolutions[0].pos, stars: 'even' });
  const cr = buildCard(evolved, { progress: 0, stars: 'even' });
  for (const a of ['strength', 'energy', 'agility', 'defense']) {
    assert(cr.attributes[a].base === cp.attributes[a].value, `${a}: base ${cr.attributes[a].base} vs value ${cp.attributes[a].value}`);
  }
  assert(cr.marks.starsDone === 0 && cr.marks.hearts === 0, 'the new card\'s track should start empty');
  return 'copied with no +1';
});

// ---------------------------------------------------------------------------
// New move format: dice, attributes, charges, effects, area, health.
// ---------------------------------------------------------------------------

// Test policy: uses the first name in the list that is available; otherwise the first available move.
function prefers(...names) {
  return {
    name: 'prefers',
    choose(atk, def, available) {
      for (const n of names) {
        const i = available.findIndex((m) => m.name === n);
        if (i >= 0) return i;
      }
      return 0;
    },
  };
}

// Passive body: very high defense, does nothing useful (a d4 move against Defense 99 = 0).
function wall(options = {}) {
  return buildSyntheticCard({ defense: 99, health: 100, ...options });
}

const attacks = (cardLog, side) => cardLog.filter((e) => e.side === side && e.move);

test('d12: damage from 1 to 12 (Strength 0, no Defense)', () => {
  const rng = createRng(21);
  const a = buildSyntheticCard({ moves: [{ die: 'd12', attribute: 'strength', element: 'normal' }] });
  const target = buildSyntheticCard({ agility: 0 });
  assert(a.moves[0].sides === 12, 'd12 sides');
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolveAttack(a, target, a.moves[0], rng);
    min = Math.min(min, r.damage);
    max = Math.max(max, r.damage);
  }
  assert(min === 1 && max === 12, `min ${min}, max ${max}`);
  return `${min}..${max}`;
});

test('Move attribute: energy adds Energy, strength adds Strength; the element (not the attribute) decides resistance', () => {
  const rng = createRng(22);
  const a = buildSyntheticCard({
    strength: 0, energy: 5,
    moves: [{ die: 'd4', attribute: 'energy', element: 'fire' }, { die: 'd4', attribute: 'strength', element: 'fire' }],
  });
  const target = buildSyntheticCard({ agility: 0 });
  let min = Infinity;
  let max = -Infinity;
  let max2 = -Infinity;
  for (let i = 0; i < 2000; i += 1) {
    const r = resolveAttack(a, target, a.moves[0], rng);
    min = Math.min(min, r.damage);
    max = Math.max(max, r.damage);
    max2 = Math.max(max2, resolveAttack(a, target, a.moves[1], rng).damage);
  }
  assert(min === 6 && max === 9, `energy: ${min}..${max}`);
  assert(max2 === 4, `strength 0: maximum ${max2}`);
  const immune = buildSyntheticCard({ agility: 0, resistances: { fire: 'immune' } });
  assert(resolveAttack(a, immune, a.moves[1], rng).damage > 0, 'legacy immunity now resists fire');
  const resist = buildSyntheticCard({ agility: 0, resistances: { fire: 'resistant' } });
  for (let i = 0; i < 500; i += 1) {
    const r = resolveAttack(a, resist, a.moves[0], rng); // (1..4 + 5) / 2 rounded up = 3..5
    assert(r.damage >= 3 && r.damage <= 5, `resistant: ${r.damage}`);
  }
  return 'ok';
});

test('Zero after Defense on a hit becomes 1', () => {
  assert(computeDamage({ die: 4, attribute: 0, defense: 4 }) === 1, 'zero -> 1');
  assert(computeDamage({ die: 4, attribute: 0, effect: 'immune', defense: 0 }) === 2, 'legacy immune -> resistance');
  assert(computeDamage({ die: 2, attribute: 0, defense: 4 }) === 0, 'negative -> 0');
  return 'ok';
});

test('Charges: uses 1 per use, even on a miss; exhausted is never chosen', () => {
  const a = buildSyntheticCard({
    health: 1000,
    moves: [{ name: 'Basic', die: 'd4' }, { name: 'Limited', die: 'd12', charges: 2 }],
  });
  const target = buildSyntheticCard({ health: 1000, agility: 8, defense: 99 });
  for (let seed = 1; seed <= 30; seed += 1) {
    const r = battle(a, target, { seed, maxTurns: 60, policy: prefers('Limited') });
    const uses = attacks(r.log, 'a').filter((e) => e.move === 'Limited');
    assert(uses.length === 2, `seed ${seed}: Limited used ${uses.length} times`);
  }
  // With Agility 8 (30% hit) some uses miss, and the charge is spent anyway.
  let misses = 0;
  for (let seed = 1; seed <= 30; seed += 1) {
    const r = battle(a, target, { seed, maxTurns: 60, policy: prefers('Limited') });
    misses += attacks(r.log, 'a').filter((e) => e.move === 'Limited' && !e.hit).length;
  }
  assert(misses > 0, 'no missed use in the 30 seeds');
  return '2 uses in 30 seeds';
});

test('Move 1 is always unlimited, even if the JSON has charges', () => {
  const novo = FIXTURES.find((s) => s.name === 'Novo');
  assert(novo.moves[0].charges === 3, 'fixture should have charges 3 on move 1');
  const c = buildCard(novo, { progress: 70 });
  assert(c.moves[0].charges === null, 'move 1 should be unlimited');
  assert(c.moves[1].charges === 1 && c.moves[2].charges === 2, 'charges of the other moves');
  return 'ok';
});

test('Fixture: moves unlocked by skill marks (numeric detail), d12 and area', () => {
  const novo = FIXTURES.find((s) => s.name === 'Novo');
  const unl = (p) => buildCard(novo, { progress: p }).moves.map((m) => m.unlocked);
  assert(JSON.stringify(unl(0)) === '[true,false,false,false]', 'progress 0');
  assert(JSON.stringify(unl(5)) === '[true,true,false,false]', 'progress 5');
  assert(JSON.stringify(unl(12)) === '[true,true,true,false]', 'progress 12');
  assert(JSON.stringify(unl(30)) === '[true,true,true,true]', 'progress 30');
  const c = buildCard(novo, { progress: 70 });
  assert(c.moves[1].sides === 12 && c.moves[1].area === true && c.moves[1].attribute === 'energy', 'd12 energy area');
  assert(c.moves[2].sides === null && c.moves[2].effect === 'sleep', 'support with no die');
  assert(buildCard(novo, { progress: 49 }).moves[1].bonus === 0 && c.moves[1].bonus === 1, 'Power at 50');
  return 'ok';
});

test('Legacy format (type/category/uses) is converted', () => {
  const m = normalizeMove({ name: 'Jet', type: 'water', category: 'elemental', die: 'd8', uses: 2 });
  assert(m.element === 'water' && m.attribute === 'energy' && m.charges === 2 && m.effect === null && m.area === false, JSON.stringify(m));
  const f = normalizeMove({ name: 'Punch', type: 'normal', category: 'physical', die: 'd4', uses: null });
  assert(f.attribute === 'strength' && f.charges === null, 'unlimited physical');
  const legado = FIXTURES.find((s) => s.name === 'Legado');
  const c9 = buildCard(legado, { progress: 9 });
  const c10 = buildCard(legado, { progress: 10 });
  assert(!c9.moves[1].unlocked && c10.moves[1].unlocked, 'unlocked by the legacy mark (name)');
  assert(c10.moves[1].charges === 2 && c10.moves[1].element === 'water', 'converted fields on the card');
  const synth = buildSyntheticCard({ moves: [{ type: 'fire', category: 'elemental', uses: 1, die: 'd6' }] });
  assert(synth.moves[0].element === 'fire' && synth.moves[0].attribute === 'energy' && synth.moves[0].charges === 1, 'synthetic accepts the legacy format');
  return 'ok';
});

test('Health cap of 24: base health + track hearts, at most 24', () => {
  const v = FIXTURES.find((s) => s.name === 'Vida16');
  assert(buildCard(v, { progress: 7 }).maxHealth === 15, 'before the hearts');
  assert(buildCard(v, { progress: 8 }).maxHealth === 16, 'one heart: 16');
  assert(buildCard(v, { progress: 70 }).maxHealth === 18, '15 + 3 = 18');
  const novo = FIXTURES.find((s) => s.name === 'Novo');
  assert(buildCard(novo, { progress: 70 }).maxHealth === 18, 'Novo adds its hearts');
  const legado = FIXTURES.find((s) => s.name === 'Legado');
  assert(buildCard(legado, { progress: 70 }).maxHealth === 9, 'below the cap adds up normally');
  return 'ok';
});

test('Effective Agility: cap 8; Swift +3 with cap 8', () => {
  const high = buildSyntheticCard({ agility: 12 });
  assert(effectiveAgility(high) === 8, 'base 12 -> 8');
  const mid = buildSyntheticCard({ agility: 6 });
  mid.tokens.swift = true;
  assert(effectiveAgility(mid) === 8, '6+3 -> cap 8');
  const low = buildSyntheticCard({ agility: 0 });
  low.tokens.swift = true;
  assert(effectiveAgility(low) === 3, '0+3 = 3');
  // Hit against Agility 12 (effective 8): 20%.
  const rng = createRng(23);
  const a = attacker(1);
  let hits = 0;
  for (let i = 0; i < N; i += 1) if (resolveAttack(a, high, a.moves[0], rng).hit) hits += 1;
  assert(Math.abs(hits / N - 0.2) <= 0.02, `rate ${hits / N}`);
  return 'ok';
});

test('Positive support does not roll to hit and applies the effect on itself', () => {
  const a = buildSyntheticCard({ agility: 9, moves: [{ name: 'Shield', die: null, attribute: null, effect: 'shield' }] });
  const target = wall({ agility: 8 });
  const r = battle(a, target, { seed: 1, maxTurns: 1 });
  const e = r.log.find((x) => x.move === 'Shield');
  assert(e && e.hitRoll === undefined && e.hit === undefined, 'should not roll to hit');
  assert(e.appliedEffect.effect === 'shield' && e.appliedEffect.alreadyHad === false, 'effect on itself');
  return 'ok';
});

test('Negative support rolls to hit against the target (Agility 8: ~20%)', () => {
  const a = buildSyntheticCard({ agility: 9, moves: [{ name: 'Sleep', die: null, attribute: null, effect: 'sleep' }] });
  const target = wall({ agility: 8 });
  let hits = 0;
  const M = 5000;
  for (let seed = 1; seed <= M; seed += 1) {
    const r = battle(a, target, { seed, maxTurns: 1 });
    const e = r.log.find((x) => x.move === 'Sleep');
    assert(e.hitRoll !== undefined, 'should roll to hit');
    assert((e.hit && e.appliedEffect) || (!e.hit && !e.appliedEffect), 'effect only on a hit');
    if (e.hit) hits += 1;
  }
  assert(Math.abs(hits / M - 0.2) <= 0.03, `rate ${hits / M}`);
  return `${(hits / M * 100).toFixed(1)}%`;
});

test('Weakness: −2 on the damage of the target\'s moves, does not stack', () => {
  const a = buildSyntheticCard({ agility: 1, health: 1000, defense: 0, moves: [{ name: 'Weakness', die: null, attribute: null, effect: 'weakness' }] });
  const b = buildSyntheticCard({ agility: 0, health: 1000, strength: 2, moves: [{ die: 'd6', attribute: 'strength' }] });
  const damages = [];
  for (let seed = 1; seed <= 20; seed += 1) {
    const r = battle(a, b, { seed, maxTurns: 100 });
    attacks(r.log, 'b').filter((e) => e.hit).forEach((e) => damages.push(e.damage));
  }
  assert(Math.min(...damages) === 1 && Math.max(...damages) === 6, `${Math.min(...damages)}..${Math.max(...damages)} (expected 1..6 = d6+2−2)`);
  const c = buildSyntheticCard({ strength: 0 });
  c.tokens.weakness = true;
  assert(applyEffect(c, 'weakness', createRng(1)).alreadyHad === true, 'does not stack');
  const rng = createRng(24);
  const target = buildSyntheticCard({ agility: 0 });
  for (let i = 0; i < 500; i += 1) {
    const r = resolveAttack(c, target, buildSyntheticCard({ moves: [{ die: 'd4' }] }).moves[0], rng);
    assert(r.damage >= 0 && r.damage <= 2, `d4 with weakness: ${r.damage}`);
  }
  return 'ok';
});

test('Poison: target loses 1 heart at the end of each of its turns; does not stack', () => {
  const a = wall({ agility: 1, moves: [{ name: 'Poison', die: null, attribute: null, effect: 'poison' }] });
  const b = buildSyntheticCard({ agility: 0, health: 3, moves: [{ die: 'd4' }] });
  const r = battle(a, b, { seed: 3 });
  assert(r.winner === 'a' && r.reason === 'KO', `winner ${r.winner}`);
  const ticks = r.log.filter((e) => e.type === 'poison');
  assert(ticks.length === 3 && ticks.every((e) => e.side === 'b'), `${ticks.length} ticks`);
  assert(ticks.map((e) => e.healthAfter).join() === '2,1,0', 'health 2,1,0 (1 per turn, no stacking even when reapplied)');
  assert(r.turns === 6, `turns ${r.turns}`);
  return 'ok';
});

test('Paralysis: on the target\'s turn, d10 from 1 to 4 does not attack (~40%)', () => {
  const a = wall({ agility: 1, health: 1000, moves: [{ name: 'Paralysis', die: null, attribute: null, effect: 'paralysis' }] });
  const b = buildSyntheticCard({ agility: 0, health: 1000, moves: [{ die: 'd4' }] });
  let stopped = 0;
  let attacked = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const r = battle(a, b, { seed, maxTurns: 400 });
    stopped += r.log.filter((e) => e.type === 'paralysis').length;
    attacked += attacks(r.log, 'b').length;
  }
  const rate = stopped / (stopped + attacked);
  assert(Math.abs(rate - 0.4) <= 0.04, `rate ${rate}`);
  return `${(rate * 100).toFixed(1)}% without attacking`;
});

test('Sleep: target loses its next turn and the token goes', () => {
  const a = buildSyntheticCard({
    agility: 1, health: 1000, defense: 99,
    moves: [{ name: 'Attack', die: 'd4' }, { name: 'Sleep', die: null, attribute: null, effect: 'sleep', charges: 1 }],
  });
  const b = buildSyntheticCard({ agility: 0, health: 1000, moves: [{ die: 'd4' }] });
  const r = battle(a, b, { seed: 4, maxTurns: 6, policy: prefers('Sleep', 'Attack') });
  const seq = r.log.filter((e) => e.turn).map((e) => `${e.side}:${e.type || e.move}`);
  assert(seq.join(' ') === 'a:Sleep b:sleep a:Attack b:Move 1 a:Attack b:Move 1', seq.join(' '));
  return seq.slice(0, 4).join(' ');
});

test('Swift: +3 Agility (cap 8) lowers the enemy\'s hit chance', () => {
  const a = buildSyntheticCard({ agility: 6, health: 1000, defense: 99, moves: [{ name: 'Swift', die: null, attribute: null, effect: 'swift' }] });
  const b = buildSyntheticCard({ agility: 0, health: 1000, moves: [{ die: 'd4' }] });
  let hits = 0;
  let total = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const r = battle(a, b, { seed, maxTurns: 400 });
    attacks(r.log, 'b').forEach((e) => { total += 1; if (e.hit) hits += 1; });
  }
  assert(Math.abs(hits / total - 0.2) <= 0.03, `rate ${hits / total}`);
  return `${(hits / total * 100).toFixed(1)}%`;
});

test('Shield: the next move received deals 0 and the token goes; the following one deals damage', () => {
  const a = buildSyntheticCard({
    agility: 1, health: 100,
    moves: [{ name: 'Attack', die: 'd4' }, { name: 'Shield', die: null, attribute: null, effect: 'shield', charges: 1 }],
  });
  const b = buildSyntheticCard({ agility: 0, health: 100, strength: 5, moves: [{ die: 'd6', attribute: 'strength' }] });
  const r = battle(a, b, { seed: 8, maxTurns: 4, policy: prefers('Shield', 'Attack') });
  const fromB = attacks(r.log, 'b');
  assert(fromB[0].hit && fromB[0].damage === 0 && fromB[0].shield === true, 'B\'s first move should deal 0 (shield)');
  assert(fromB[1].damage >= 6 && !fromB[1].shield, `B's second move: damage ${fromB[1].damage}`);
  assert(r.healthLeft.a === 100 - fromB[1].damage, 'A\'s health');
  return 'ok';
});

test('Shield against a move that misses: token is not consumed', () => {
  const a = buildSyntheticCard({ agility: 8 });
  a.tokens.shield = true;
  const b = attacker(5);
  const rng = createRng(25);
  for (let i = 0; i < 2000; i += 1) {
    const r = resolveAttack(b, a, b.moves[0], rng);
    assert(r.hit || !r.shield, 'a miss should not mark shield');
  }
  return 'ok';
});

test('Extra Strength: +2 on the damage of its own moves', () => {
  const rng = createRng(26);
  const a = attacker(0);
  a.tokens.extra_strength = true;
  const target = buildSyntheticCard({ agility: 0 });
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const r = resolveAttack(a, target, a.moves[0], rng);
    min = Math.min(min, r.damage);
    max = Math.max(max, r.damage);
  }
  assert(min === 3 && max === 8, `${min}..${max} (d6+2)`);
  // Through a battle: a support move applies the token on itself.
  const s = buildSyntheticCard({ agility: 1, health: 1000, moves: [{ name: 'Fury', die: null, attribute: null, effect: 'extra_strength', charges: 1 }, { name: 'Attack', die: 'd4', attribute: 'strength' }] });
  const r = battle(s, wall({ health: 1000, defense: 0, agility: 0 }), { seed: 2, maxTurns: 4, policy: prefers('Fury', 'Attack') });
  const e = attacks(r.log, 'a')[1];
  assert(e.damage >= 3 && e.damage <= 6, `after Fury: d4+2 = 3..6, got ${e.damage}`);
  return 'ok';
});

test('Heal: recovers 1d6 hearts, never above max health', () => {
  const rng = createRng(27);
  const c = buildSyntheticCard({ health: 10 });
  const seen = new Set();
  for (let i = 0; i < 2000; i += 1) {
    c.currentHealth = 9; // missing 1: always caps at 10
    const r = applyEffect(c, 'heal', rng);
    assert(c.currentHealth === 10 && r.healed === 1, `health ${c.currentHealth}`);
    c.currentHealth = 2;
    const r2 = applyEffect(c, 'heal', rng);
    seen.add(r2.roll);
    assert(c.currentHealth === 2 + r2.roll && r2.healed === r2.roll, 'full 1d6 heal');
  }
  assert(seen.size === 6 && Math.min(...seen) === 1 && Math.max(...seen) === 6, 'faces 1..6');
  c.currentHealth = 10;
  assert(applyEffect(c, 'heal', rng).healed === 0 && c.currentHealth === 10, 'full: nothing');
  // In battle: never above the maximum.
  const a = buildSyntheticCard({ agility: 0, health: 6, moves: [{ name: 'Heal', die: null, attribute: null, effect: 'heal' }] });
  const b = buildSyntheticCard({ agility: 0, health: 1000, moves: [{ die: 'd4', attribute: 'strength' }] });
  let heals = 0;
  for (let seed = 1; seed <= 50; seed += 1) {
    const r = battle(a, b, { seed, maxTurns: 40 });
    r.log.filter((e) => e.appliedEffect && e.appliedEffect.effect === 'heal').forEach((e) => {
      heals += 1;
      assert(e.appliedEffect.healed <= e.appliedEffect.roll, 'healed more than the roll');
    });
    assert(r.healthLeft.a <= 6, `health ${r.healthLeft.a} above the maximum`);
  }
  assert(heals > 0, 'no heal recorded');
  return `${heals} heals`;
});

test('Effects do not stack: a token already present is a no-op', () => {
  const c = buildSyntheticCard({});
  for (const ef of ['weakness', 'poison', 'paralysis', 'sleep', 'swift', 'shield', 'extra_strength']) {
    assert(applyEffect(c, ef, createRng(1)).alreadyHad === false, `${ef} 1st time`);
    assert(applyEffect(c, ef, createRng(1)).alreadyHad === true, `${ef} 2nd time`);
    assert(c.tokens[ef] === true, `${ef} is a boolean token`);
  }
  return 'ok';
});

test('Tokens go at the end of the fight (each battle starts clean)', () => {
  const a = buildSyntheticCard({ agility: 1, moves: [{ name: 'Shield', die: null, attribute: null, effect: 'shield' }] });
  battle(a, wall(), { seed: 1, maxTurns: 3 });
  assert(Object.keys(a.tokens).length === 0, 'the original card must not gain tokens');
  const r1 = battle(a, wall(), { seed: 1, maxTurns: 3 });
  assert(r1.log.find((e) => e.move === 'Shield').appliedEffect.alreadyHad === false, 'new fight, new token');
  return 'ok';
});

test('Area in 1 vs 1 behaves like a normal move', () => {
  const mk = (area) => buildSyntheticCard({ strength: 2, moves: [{ die: 'd8', area, element: 'fire', attribute: 'strength' }] });
  const target = buildSyntheticCard({ health: 12, agility: 3, defense: 1 });
  for (let seed = 1; seed <= 50; seed += 1) {
    const x = battle(mk(true), target, { seed });
    const y = battle(mk(false), target, { seed });
    assert(JSON.stringify(x) === JSON.stringify(y), `seed ${seed} differs`);
  }
  return '50 identical seeds';
});

test('Initiative: higher Agility starts; tie is a coin flip (~50%)', () => {
  const fast = buildSyntheticCard({ agility: 4 });
  const slow = buildSyntheticCard({ agility: 2 });
  assert(battle(fast, slow, { seed: 1 }).log[0].first === 'a', 'a faster');
  assert(battle(slow, fast, { seed: 1 }).log[0].first === 'b', 'b faster');
  let a = 0;
  for (let seed = 1; seed <= 2000; seed += 1) if (battle(fast, fast, { seed }).log[0].first === 'a') a += 1;
  assert(Math.abs(a / 2000 - 0.5) <= 0.05, `tie: ${a / 2000}`);
  return 'ok';
});

test('Default policy: support when the effect is worth more than the best attack; does not repeat an active effect', () => {
  const a = buildSyntheticCard({ health: 20, moves: [{ name: 'Attack', die: 'd4' }, { name: 'Sleep', die: null, attribute: null, effect: 'sleep', charges: 2 }] });
  const b = buildSyntheticCard({ health: 20, agility: 0, strength: 5, moves: [{ die: 'd12' }] });
  assert(defaultPolicy.choose(a, b, a.moves) === 1, 'should use Sleep on the first turn');
  b.tokens.sleep = true;
  assert(defaultPolicy.choose(a, b, a.moves) === 0, 'Sleep already applied: attacks');
  // Against a weak target the attack is worth more than the effect.
  const weak = buildSyntheticCard({ health: 20, agility: 0, moves: [{ die: 'd4' }] });
  const strong = buildSyntheticCard({ health: 20, strength: 6, moves: [{ name: 'Attack', die: 'd8' }, { name: 'Sleep', die: null, attribute: null, effect: 'sleep' }] });
  assert(defaultPolicy.choose(strong, weak, strong.moves) === 0, 'strong attack against a weak target');
  // An active Shield is not repeated; Heal only with health missing.
  const c = buildSyntheticCard({ health: 20, moves: [{ name: 'Attack', die: 'd4' }, { name: 'Shield', die: null, attribute: null, effect: 'shield' }, { name: 'Heal', die: null, attribute: null, effect: 'heal' }] });
  const strongB = buildSyntheticCard({ health: 30, strength: 5, agility: 0, moves: [{ die: 'd12' }] });
  c.tokens.shield = true;
  assert(defaultPolicy.choose(c, strongB, c.moves) === 0, 'full health and active shield: attacks');
  c.currentHealth = 3;
  assert(defaultPolicy.choose(c, strongB, c.moves) === 2, 'low health: heals');
  return 'ok';
});

test('Random policy: deterministic per seed and uses support moves', () => {
  const novo = FIXTURES.find((s) => s.name === 'Novo');
  const a = buildCard(novo, { progress: 70 });
  const b = buildCard(FIXTURES.find((s) => s.name === 'Legado'), { progress: 70 });
  const x = battle(a, b, { seed: 7, policy: random });
  const y = battle(a, b, { seed: 7, policy: random });
  assert(JSON.stringify(x) === JSON.stringify(y), 'not deterministic');
  const usedSupport = Array.from({ length: 50 }, (_, s) => battle(a, b, { seed: s, policy: random }).log)
    .some((l) => l.some((e) => e.move === 'Pó do Sono' || e.move === 'Descanso'));
  assert(usedSupport, 'never chose a support move');
  return 'ok';
});

test('Fixtures: every card combination runs with both policies', () => {
  let battles = 0;
  for (const ea of FIXTURES) {
    for (const eb of FIXTURES) {
      for (const pol of [defaultPolicy, random]) {
        for (const prog of [0, 12, 70]) {
          const r = battle(buildCard(ea, { progress: prog }), buildCard(eb, { progress: prog }), { seed: 3, policy: pol });
          assert(['KO', 'limit'].includes(r.reason), 'reason');
          battles += 1;
        }
      }
    }
  }
  return `${battles} battles`;
});

test('Scenario: every card builds and fights (new or legacy format)', () => {
  const newFormat = DEFAULT_DATA.filter((s) => s.moves.every((m) => m.element !== undefined)).length;
  let n = 0;
  DEFAULT_DATA.forEach((s, i) => {
    const other = DEFAULT_DATA[(i + 1) % DEFAULT_DATA.length];
    const ca = buildCard(s, { progress: 70 });
    const cb = buildCard(other, { progress: 70 });
    assert(ca.moves[0].charges === null, `${s.name}: move 1 should be unlimited`);
    assert(ca.maxHealth <= 24, `${s.name}: health ${ca.maxHealth}`);
    for (const pol of [defaultPolicy, random]) {
      const r = battle(ca, cb, { seed: 11, policy: pol, log: false });
      assert(r.turns > 0, 'turns');
      n += 1;
    }
  });
  return `${n} battles; ${newFormat}/${DEFAULT_DATA.length} species already in the new format`;
});

console.log('');
console.log(failures === 0 ? 'All tests passed.' : `${failures} test(s) failed.`);
if (failures > 0) process.exitCode = 1;
