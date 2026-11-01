#!/usr/bin/env node
// Checks the 4 moves of each species against docs/moves.md.
// Usage: node scripts/check-moves.js [maxId]
const fs = require('fs');
const path = require('path');
const pk = require(path.join(__dirname, '..', 'lib', 'scenario')).creatures();
const maxId = Number(process.argv[2]) || 999;
const DIE_WEIGHT = { d4: 1, d6: 2, d8: 3, d12: 5 };
const CHARGES_WEIGHT = { 3: -1, 2: -1, 1: -2 };
const EFFECT_WEIGHT = { weakness: 1, poison: 2, paralysis: 2, sleep: 2, swift: 1, shield: 1, extra_strength: 2, heal: 2 };
const BUDGET = { base: 6, middle: 9, final: 12, no_evolution: 11, rare: 16 };
const ATTRS = [null, 'strength', 'energy'];
const ELEMS = new Set(['normal','fire','water','plant','electric','ice','fighter','poison','earth','air','psychic','insect','stone','ghost','dragon']);
const FIELDS = ['name','icon','element','attribute','die','charges','effect','area','weight','unlocked_at'];

function weight(m) {
  const w = (m.die ? DIE_WEIGHT[m.die] : 0) + (m.charges ? CHARGES_WEIGHT[m.charges] : 0) +
    (m.effect ? EFFECT_WEIGHT[m.effect] : 0) + (m.area ? 2 : 0);
  return Math.max(0, w);
}
function stage(x) {
  if (x.rare) return 'rare';
  const ev = x.evolutions && x.evolutions.length > 0, inherits = !!x.inherits_attributes;
  if (!inherits && ev) return 'base';
  if (inherits && ev) return 'middle';
  if (inherits) return 'final';
  return 'no_evolution';
}
const errors = [];
const dieCount = {}, effectCount = {};
let area = 0, total = 0;
const namesBySpecies = {};
for (const x of pk) {
  if (x.id > maxId) continue;
  const e = (msg) => errors.push(`#${x.id} ${x.name}: ${msg}`);
  const ms = x.moves;
  if (!Array.isArray(ms) || ms.length !== 4) { e('does not have 4 moves'); continue; }
  const st = stage(x);
  let sum = 0, supports = 0, primary = false;
  const dice = new Set();
  ms.forEach((m, i) => {
    for (const f of FIELDS) if (!(f in m)) e(`move ${i + 1} missing field ${f}`);
    for (const f of Object.keys(m)) if (!FIELDS.includes(f)) e(`move ${i + 1} extra field ${f}`);
    if (!m.name || !m.icon) e(`move ${i + 1} missing name/icon`);
    if (!ELEMS.has(m.element)) e(`move ${i + 1} invalid element ${m.element}`);
    if (m.die !== null && !(m.die in DIE_WEIGHT)) e(`move ${i + 1} invalid die`);
    if (m.die === null) { supports++; if (m.attribute !== null && m.attribute !== undefined && !ATTRS.includes(m.attribute)) e(`move ${i + 1} invalid attribute`); }
    else if (m.attribute !== 'strength' && m.attribute !== 'energy') e(`move ${i + 1} invalid attribute ${m.attribute}`);
    if (m.charges !== null && ![1, 2, 3].includes(m.charges)) e(`move ${i + 1} invalid charges`);
    if (m.effect !== null && !(m.effect in EFFECT_WEIGHT)) e(`move ${i + 1} invalid effect ${m.effect}`);
    if (typeof m.area !== 'boolean') e(`move ${i + 1} area is not boolean`);
    if (m.unlocked_at !== i + 1) e(`move ${i + 1} unlocked_at ${m.unlocked_at}`);
    if (m.die === null && m.effect === null) e(`move ${i + 1} support with no effect`);
    if (m.die === 'd12' && st !== 'final' && st !== 'rare' && st !== 'no_evolution') e(`d12 at stage ${st}`);
    if (weight(m) !== m.weight) e(`move ${i + 1} weight ${m.weight} != computed ${weight(m)}`);
    sum += weight(m);
    if (m.element === x.types[0]) primary = true;
    dice.add(m.die);
    dieCount[m.die || 'support'] = (dieCount[m.die || 'support'] || 0) + 1;
    effectCount[m.effect || 'none'] = (effectCount[m.effect || 'none'] || 0) + 1;
    if (m.area) area++;
    total++;
    (namesBySpecies[m.name] = namesBySpecies[m.name] || new Set()).add(x.id);
  });
  if (ms[0].charges !== null) e('move 1 is not unlimited');
  if (supports > 1) e('more than 1 support');
  if (!primary) e(`no move of the primary element (${x.types[0]})`);
  if (dice.size < 2) e('fewer than 2 different dice');
  const budget = BUDGET[st];
  if (sum > budget || sum < budget - 1) e(`sum ${sum} outside budget ${budget} (${st})`);
}
// final/rare form needs at least 1 exclusive name (only this species has it)
for (const x of pk) {
  if (x.id > maxId || !Array.isArray(x.moves)) continue;
  const st = stage(x);
  if (st === 'final' || st === 'rare') {
    if (!x.moves.some((m) => namesBySpecies[m.name] && namesBySpecies[m.name].size === 1))
      errors.push(`#${x.id} ${x.name}: no move with an exclusive name`);
  }
}
if (errors.length) { console.log(errors.join('\n')); console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log(`OK: ${pk.filter((x) => x.id <= maxId).length} species, ${total} moves`);
console.log('by die:', JSON.stringify(dieCount));
console.log('by effect:', JSON.stringify(effectCount));
console.log('area:', area);
