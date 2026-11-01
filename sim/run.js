#!/usr/bin/env node
'use strict';

// Simulator CLI. Usage:
//   node sim/run.js <A> <B> [--progress 10,25,50] [--n 2000] [--policy default|random]
//                   [--stars even|strength|agility] [--seed 12345]
//   node sim/run.js --list
// A and B accept a comma-separated list (everyone against everyone). Creature name or number.

const { DEFAULT_DATA, findSpecies, buildCard, listStarPolicies } = require('./card');
const { battle, createRng, DEFAULT_SEED } = require('./engine');
const { getMovePolicy } = require('./policy');

const DEFAULTS = { progress: '10,35,70', n: 2000, policy: 'default', stars: 'even', seed: DEFAULT_SEED };

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--list') options.list = true;
    else if (a === '-h' || a === '--help') options.help = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${a}.`);
      options[key] = value;
      i += 1;
    } else positional.push(a);
  }
  return { positional, options };
}

function integer(value, name, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || (max !== undefined && n > max)) {
    throw new Error(`Invalid ${name}: "${value}".`);
  }
  return n;
}

function fmtPct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function fmtNum(x) {
  return x.toFixed(1);
}

function help() {
  return [
    'Usage: node sim/run.js <A> <B> [options]',
    '',
    '  A, B          creature name or number; comma-separated list (e.g. 25,26)',
    '  --progress    track positions, comma-separated (default 10,35,70; each value from 0 to 70)',
    '  --n           simulations per matchup (default 2000)',
    '  --policy      move choice: default (highest expected value: damage + effect) | random (default default)',
    `  --stars       star distribution: ${listStarPolicies().join(' | ')} (default even)`,
    `  --seed        seed (default ${DEFAULT_SEED}); same seed, same result`,
    '  --list        lists the available species',
  ].join('\n');
}

function list() {
  return DEFAULT_DATA.map((s) => `${String(s.id).padStart(3, '0')} ${s.name}`).join('\n');
}

function run(argv) {
  const { positional, options } = parseArgs(argv);
  if (options.help) return help();
  if (options.list) return list();

  if (positional.length !== 2) throw new Error('Give two species (A and B). Use --help to see the options.');

  const n = integer(options.n !== undefined ? options.n : DEFAULTS.n, '--n', 1);
  const seed = integer(options.seed !== undefined ? options.seed : DEFAULTS.seed, '--seed', 0);
  const policy = getMovePolicy(options.policy || DEFAULTS.policy);
  const stars = options.stars || DEFAULTS.stars;
  const progresses = (options.progress || DEFAULTS.progress)
    .split(',')
    .map((p) => integer(p.trim(), '--progress', 0, 70));

  const listA = positional[0].split(',').map((s) => findSpecies(s.trim()));
  const listB = positional[1].split(',').map((s) => findSpecies(s.trim()));

  const lines = [];
  lines.push(`Battle simulator | N=${n} | move policy: ${policy.name} | stars: ${stars} | seed: ${seed}`);
  lines.push('');
  const header = ['Prog.', 'A', 'B', `Win A`, `Win B`, 'Draw', 'Turns (avg)'];
  const widths = [6, 16, 16, 9, 9, 9, 15];
  const format = (cols) => cols.map((c, i) => String(c).padEnd(widths[i])).join(' ').trimEnd();
  lines.push(format(header));
  lines.push(widths.map((w) => '-'.repeat(w - 1)).join(' '));

  for (const prog of progresses) {
    for (const speciesA of listA) {
      for (const speciesB of listB) {
        const cardA = buildCard(speciesA, { progress: prog, stars });
        const cardB = buildCard(speciesB, { progress: prog, stars });
        // Same seed for each matchup: results comparable across species.
        const rng = createRng(seed);
        let winA = 0;
        let winB = 0;
        let draws = 0;
        let turnSum = 0;
        for (let i = 0; i < n; i += 1) {
          const r = battle(cardA, cardB, { rng, policy, log: false });
          if (r.winner === 'a') winA += 1;
          else if (r.winner === 'b') winB += 1;
          else draws += 1;
          turnSum += r.turns;
        }
        lines.push(format([
          prog,
          speciesA.name,
          speciesB.name,
          fmtPct(winA / n),
          fmtPct(winB / n),
          fmtPct(draws / n),
          fmtNum(turnSum / n),
        ]));
      }
    }
  }
  lines.push('');
  lines.push('Draw = battle that reached the 1000-turn limit without a KO (e.g. Agility above 10 that is never hit).');
  return lines.join('\n');
}

if (require.main === module) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { run };
