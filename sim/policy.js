'use strict';

// Move choice policies (used by the engine) and star distribution policies (used by card.js).

const {
  NEGATIVE_EFFECTS,
  moveAttribute,
  effectiveAgility,
  tokenAdjustment,
  computeDamage,
  typeEffect,
  hitChance,
  has,
} = require('./engine');

// Expected average damage of a die move against the current target: P(hit) x average damage on a hit.
// Computed exactly, going through every face of the die. Considers tokens (Extra Strength, Weakness,
// target's Swift, target's Shield). Support move (no die): 0.
function expectedDamage(attacker, defender, move) {
  if (!move.die) return 0;
  const p = hitChance(effectiveAgility(defender));
  if (p === 0) return 0;
  if (has(defender, 'shield')) return 0;
  const attribute = attacker.attributes[moveAttribute(move)].value;
  const effect = typeEffect(defender, move.element);
  const defense = defender.attributes.defense.value;
  const bonus = (move.bonus || 0) + tokenAdjustment(attacker);
  let sum = 0;
  for (let face = 1; face <= move.sides; face += 1) {
    sum += computeDamage({ die: face, bonus, attribute, effect, defense });
  }
  return (p * sum) / move.sides;
}

const MAX_HORIZON = 3; // future turns an effect is counted for

// Best expected damage per turn of `who` against `against`, among unlocked moves with charges.
function bestExpectedDamage(who, against) {
  let best = 0;
  for (const m of who.moves) {
    if (!m.unlocked || (m.charges !== null && m.chargesLeft <= 0)) continue;
    best = Math.max(best, expectedDamage(who, against, m));
  }
  return best;
}

// Expected value, in hearts, of a move's effect. 0 if the token is already applied.
// Simple heuristic: the effect counts for at most 3 turns (fewer if the target dies first);
// the gain is measured in damage avoided or dealt per turn.
//   weakness       2 x P(target hits me) per turn (the -2 adjustment applies per target move)
//   poison         1 per turn
//   paralysis      40% x target's best expected damage
//   sleep          target's best expected damage (1 turn only)
//   swift          lowers the target's chance to hit me by 30 points (3 Agility): 0.3 x target's damage
//   shield         target's best expected damage (cancels 1 move)
//   extra_strength +2 x P(hit) per turn
//   heal           average of 1d6 capped at the missing hearts
// A negative effect only counts if the move hits: multiplied by P(hit) when the move has no die
// (with a die, the hit is already in the expected damage and the effect follows the same hit).
function effectValue(attacker, defender, move, horizon) {
  const effect = move.effect;
  if (!effect) return 0;
  const pHit = hitChance(effectiveAgility(defender));
  const damage = bestExpectedDamage(defender, attacker);
  const isNegative = NEGATIVE_EFFECTS.includes(effect);
  if (effect === 'heal') {
    const missing = attacker.maxHealth - attacker.currentHealth;
    // Average of min(1d6, missing)
    let sum = 0;
    for (let f = 1; f <= 6; f += 1) sum += Math.min(f, missing);
    return sum / 6;
  }
  if (has(isNegative ? defender : attacker, effect)) return 0;
  let value = 0;
  if (effect === 'weakness') value = 2 * hitChance(effectiveAgility(attacker)) * horizon;
  else if (effect === 'poison') value = 1 * horizon;
  else if (effect === 'paralysis') value = 0.4 * damage * horizon;
  else if (effect === 'sleep') value = damage;
  else if (effect === 'swift') {
    const agility = effectiveAgility(attacker);
    const gain = hitChance(agility) - hitChance(Math.min(8, agility + 3));
    value = gain * damage * horizon;
  } else if (effect === 'shield') value = damage;
  else if (effect === 'extra_strength') value = 2 * pHit * horizon;
  return isNegative && !move.die ? value * pHit : value;
}

// Default: move with the highest expected value = expected damage + effect value (see effectValue).
// An already applied effect is worth 0, so the policy only uses a support move when the effect is not active yet
// and is worth more than the best attack (e.g. Sleep or Shield on the first turn against a strong attacker).
// Tie: the first in the list. No randomness, so it is deterministic.
const defaultPolicy = {
  name: 'default',
  choose(attacker, defender, available) {
    const bestDamage = Math.max(1, ...available.map((m) => expectedDamage(attacker, defender, m)));
    const horizon = Math.min(MAX_HORIZON, Math.max(1, Math.ceil(defender.currentHealth / bestDamage)));
    let best = 0;
    let bestValue = -1;
    available.forEach((m, i) => {
      const v = expectedDamage(attacker, defender, m) + effectValue(attacker, defender, m, horizon);
      if (v > bestValue) {
        bestValue = v;
        best = i;
      }
    });
    return best;
  },
};

// Alternative: picks an available move at random (uses the battle's rng).
const random = {
  name: 'random',
  choose(attacker, defender, available, rng) {
    return Math.floor(rng() * available.length);
  },
};

const MOVE_POLICIES = { default: defaultPolicy, random };

// Stars: fill order in groups. Within a group, distributes in round-robin
// (one star at a time) until full. The next group only gets stars when the previous one is full.
const STAR_POLICIES = {
  even: [['strength', 'energy', 'agility', 'defense']],
  strength: [['strength', 'energy'], ['agility', 'defense']],
  agility: [['agility'], ['strength', 'energy', 'defense']],
};

function listStarPolicies() {
  return Object.keys(STAR_POLICIES);
}

function getMovePolicy(name) {
  const p = MOVE_POLICIES[name];
  if (!p) throw new Error(`Unknown move policy: "${name}". Use: ${Object.keys(MOVE_POLICIES).join(', ')}.`);
  return p;
}

// Distributes `n` stars among the attributes, respecting each one's capacity (slots).
function distributeStars(n, capacity, policy) {
  const groups = STAR_POLICIES[policy];
  if (!groups) throw new Error(`Unknown star policy: "${policy}". Use: ${listStarPolicies().join(', ')}.`);
  const allocated = { strength: 0, energy: 0, agility: 0, defense: 0 };
  let remaining = n;
  for (const group of groups) {
    let moved = true;
    while (remaining > 0 && moved) {
      moved = false;
      for (const attr of group) {
        if (remaining > 0 && allocated[attr] < capacity[attr]) {
          allocated[attr] += 1;
          remaining -= 1;
          moved = true;
        }
      }
    }
  }
  return allocated;
}

module.exports = {
  default: defaultPolicy,
  random,
  expectedDamage,
  effectValue,
  getMovePolicy,
  distributeStars,
  listStarPolicies,
};
