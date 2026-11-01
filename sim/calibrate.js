'use strict';

// Calibration: each species faces every other species of the same stage (everyone against everyone),
// at progress 10, 35 and 70. Also measures the advantage between stages (final form against base).
// Usage: node sim/calibrate.js [--n 200] [--out scenarios/<id>/proposals/calibration.json]

const fs = require('fs');
const path = require('path');
const { DEFAULT_DATA, buildCard } = require('./card');
const scenario = require('../lib/scenario');
const { battle, createRng, DEFAULT_SEED } = require('./engine');
const { getMovePolicy } = require('./policy');

const PROGRESSES = [10, 35, 70];

function stage(s) {
  if (s.rare) return 'rare';
  const evolves = Array.isArray(s.evolutions) && s.evolutions.length > 0;
  if (s.inherits_attributes) return evolves ? 'middle' : 'final';
  return evolves ? 'base' : 'no_evolution';
}

function argument(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function matchup(a, b, prog, n, policy) {
  const cardA = buildCard(a, { progress: prog, stars: 'even' });
  const cardB = buildCard(b, { progress: prog, stars: 'even' });
  const rng = createRng(DEFAULT_SEED);
  let wins = 0;
  for (let i = 0; i < n; i += 1) {
    const r = battle(cardA, cardB, { rng, policy, log: false });
    if (r.winner === 'a') wins += 1;
    else if (r.winner !== 'b') wins += 0.5;
  }
  return wins / n;
}

function main() {
  const n = Number(argument('--n', 200));
  const out = argument('--out', path.join(scenario.dir(), 'proposals', 'calibration.json'));
  const data = DEFAULT_DATA;
  const policy = getMovePolicy('default');

  const groups = {};
  for (const s of data) (groups[stage(s)] = groups[stage(s)] || []).push(s);

  const species = {};
  for (const [groupName, list] of Object.entries(groups)) {
    for (const prog of PROGRESSES) {
      const sum = new Map(list.map((s) => [s.name, 0]));
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const p = matchup(list[i], list[j], prog, n, policy);
          sum.set(list[i].name, sum.get(list[i].name) + p);
          sum.set(list[j].name, sum.get(list[j].name) + (1 - p));
        }
      }
      for (const s of list) {
        const avg = list.length > 1 ? sum.get(s.name) / (list.length - 1) : 0.5;
        species[s.name] = species[s.name] || { id: s.id, stage: groupName, winRate: {} };
        species[s.name].winRate[prog] = Number(avg.toFixed(3));
      }
    }
  }

  // Advantage between stages: average win rate of one stage against another, at progress 35.
  const pairs = [['middle', 'base'], ['final', 'middle'], ['final', 'base'], ['no_evolution', 'final'], ['rare', 'final']];
  const betweenStages = {};
  for (const [x, y] of pairs) {
    let s = 0;
    let c = 0;
    for (const a of groups[x] || []) {
      for (const b of groups[y] || []) {
        s += matchup(a, b, 35, Math.max(20, Math.floor(n / 4)), policy);
        c += 1;
      }
    }
    betweenStages[`${x} x ${y}`] = c ? Number((s / c).toFixed(3)) : null;
  }

  const outside = Object.entries(species)
    .filter(([, v]) => v.stage !== 'rare' && (v.winRate[35] < 0.4 || v.winRate[35] > 0.6))
    .map(([name, v]) => ({ name, stage: v.stage, p35: v.winRate[35] }))
    .sort((a, b) => a.p35 - b.p35);

  const result = { n, progress: PROGRESSES, range: [0.4, 0.6], species, betweenStages, outside };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`Outside the range at p35: ${outside.length} of ${Object.keys(species).length}`);
  console.log('Between stages (p35):', JSON.stringify(betweenStages));
}

if (require.main === module) main();

module.exports = { stage };
