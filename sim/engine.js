'use strict';

// 1-vs-1 combat engine (rules in docs/rules.md, section 6).
// Does not model critical hits, capture, fleeing, rest or switching creatures. See sim/README.md.

const DEFAULT_SEED = 12345;

const AGILITY_CAP = 8;
const HEALTH_CAP = 16;
const PARALYSIS_LIMIT = 4; // d10 from 1 to 4: does not attack
const NEGATIVE_EFFECTS = ['weakness', 'poison', 'paralysis', 'sleep'];
const POSITIVE_EFFECTS = ['swift', 'shield', 'extra_strength', 'heal'];
// Effects that stay on the card as a token (heal is instant).
const TOKEN_EFFECTS = ['weakness', 'poison', 'paralysis', 'sleep', 'swift', 'shield', 'extra_strength'];

// Deterministic generator (mulberry32). Same seed, same sequence.
function createRng(seed = DEFAULT_SEED) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rolls a die with `sides` faces: integer from 1 to `sides`.
function roll(sides, rng) {
  return Math.floor(rng() * sides) + 1;
}

// Hit chance against the target's Agility: P(d10 >= Agility).
// Agility 0 or 1 always hits. Agility above 10 never hits.
function hitChance(agility) {
  const ag = Math.max(0, agility);
  if (ag <= 1) return 1;
  if (ag > 10) return 0;
  return (11 - ag) / 10;
}

// Type effect the target applies to the move's element: 'vulnerable' | 'resistant' | 'immune' | 'neutral'.
function typeEffect(target, element) {
  const map = target.resistances || {};
  return map[element] || 'neutral';
}

function has(card, effect) {
  return Boolean(card.tokens && card.tokens[effect]);
}

// Effective Agility: base (+3 with Swift), capped at 8.
function effectiveAgility(card) {
  const base = card.attributes.agility.value + (has(card, 'swift') ? 3 : 0);
  return Math.min(AGILITY_CAP, base);
}

// Damage adjustment from the attacker's tokens: Extra Strength +2, Weakness −2 (they add up if both are present).
function tokenAdjustment(card) {
  return (has(card, 'extra_strength') ? 2 : 0) - (has(card, 'weakness') ? 2 : 0);
}

// Final damage (section 6, steps 2 to 4).
// Immune zeroes before anything else. `bonus` goes into the subtotal (Power, Extra Strength, Weakness),
// before the type effect. After Defense: negative becomes 0, zero becomes 1.
function computeDamage({ die, bonus = 0, attribute, effect = 'neutral', defense }) {
  if (effect === 'immune') return 0;
  const subtotal = die + bonus + attribute;
  let applied = subtotal;
  if (effect === 'vulnerable') applied = subtotal * 2;
  else if (effect === 'resistant') applied = Math.ceil(subtotal / 2);
  const net = applied - defense;
  if (net < 0) return 0;
  if (net === 0) return 1;
  return net;
}

function moveAttribute(move) {
  return move.attribute || 'strength';
}

// One attack action with a die move: hit (d10 against the target's effective Agility), then damage.
// Does not change health or tokens: `battle` applies the consequences.
// Shield on the target: the hit happens, damage becomes 0 and `shield: true` signals that the token must go.
function resolveAttack(attacker, defender, move, rng) {
  const hitRoll = roll(10, rng);
  const agility = effectiveAgility(defender);
  if (hitRoll < agility) {
    return { hit: false, hitRoll, damage: 0 };
  }
  const die = roll(move.sides, rng);
  const bonus = (move.bonus || 0) + tokenAdjustment(attacker);
  const attribute = attacker.attributes[moveAttribute(move)].value;
  const effect = typeEffect(defender, move.element);
  const defense = defender.attributes.defense.value;
  if (has(defender, 'shield')) {
    return { hit: true, hitRoll, die, bonus, attribute, effect, defense, damage: 0, shield: true };
  }
  const damage = computeDamage({ die, bonus, attribute, effect, defense });
  return { hit: true, hitRoll, die, bonus, attribute, effect, defense, damage };
}

function availableMoves(card) {
  const indices = [];
  card.moves.forEach((m, i) => {
    if (m.unlocked && (m.charges === null || m.chargesLeft > 0)) indices.push(i);
  });
  return indices;
}

// Independent copy of the battle state (health, charges and tokens restored).
function cloneCard(card) {
  const c = JSON.parse(JSON.stringify(card));
  c.currentHealth = c.maxHealth;
  c.tokens = {};
  c.moves.forEach((m) => {
    m.chargesLeft = m.charges;
  });
  return c;
}

// Applies a positive effect on `card` (token or instant heal). Returns what happened.
function applyEffect(card, effect, rng) {
  if (effect === 'heal') {
    const rolled = roll(6, rng);
    const before = card.currentHealth;
    card.currentHealth = Math.min(card.maxHealth, card.currentHealth + rolled);
    return { effect, roll: rolled, healed: card.currentHealth - before };
  }
  const alreadyHad = has(card, effect);
  card.tokens[effect] = true;
  return { effect, alreadyHad };
}

// battle(a, b, options) -> { winner: 'a'|'b'|null, reason, turns, healthLeft, log }
// Options:
//   seed        seed (default 12345), used if rng is not passed
//   rng         function that returns a number in [0, 1)
//   policy      object from sim/policy.js (default: policy.default)
//   maxTurns    action limit (default 1000). When reached, reason = 'limit' and winner = null
//   log         false to skip building the event log (used in batches)
// Each turn (attack action, lost turn or turn with no move) counts as one. The side with higher Agility
// acts first. Order within one side's turn: Sleep (loses the turn, token goes) -> Paralysis (d10 1 to 4,
// does not attack) -> move choice and use -> Poison (loses 1 heart at the end of the turn, even if the turn was lost).
function battle(a, b, options = {}) {
  const rng = options.rng || createRng(options.seed !== undefined ? options.seed : DEFAULT_SEED);
  const policy = options.policy || require('./policy').default;
  const maxTurns = options.maxTurns || 1000;
  const record = options.log !== false;

  const cards = { a: cloneCard(a), b: cloneCard(b) };
  const log = [];

  // Initiative: old rule, base Agility (there are no tokens yet at the start of the fight).
  const agA = cards.a.attributes.agility.value;
  const agB = cards.b.attributes.agility.value;
  let current;
  let coinFlip = false;
  if (agA > agB) current = 'a';
  else if (agB > agA) current = 'b';
  else {
    current = rng() < 0.5 ? 'a' : 'b';
    coinFlip = true;
  }
  if (record) {
    log.push({ type: 'start', agility: { a: agA, b: agB }, first: current, coinFlip });
  }

  let turn = 0;
  let winner = null;
  let reason = 'limit';

  while (turn < maxTurns) {
    turn += 1;
    const target = current === 'a' ? 'b' : 'a';
    const atk = cards[current];
    const def = cards[target];
    let losesTurn = false;

    if (has(atk, 'sleep')) {
      delete atk.tokens.sleep;
      losesTurn = true;
      if (record) log.push({ turn, side: current, type: 'sleep' });
    } else if (has(atk, 'paralysis')) {
      const rolled = roll(10, rng);
      if (rolled <= PARALYSIS_LIMIT) {
        losesTurn = true;
        if (record) log.push({ turn, side: current, type: 'paralysis', roll: rolled });
      }
    }

    if (!losesTurn) {
      const available = availableMoves(atk);
      if (available.length === 0) {
        if (record) log.push({ turn, side: current, type: 'no_move' });
      } else {
        const chosen = policy.choose(atk, def, available.map((i) => atk.moves[i]), rng);
        const move = atk.moves[available[chosen]];
        if (move.charges !== null) move.chargesLeft -= 1;

        const negative = NEGATIVE_EFFECTS.includes(move.effect);
        const event = {
          turn,
          side: current,
          move: move.name,
          element: move.element,
          moveAttribute: move.attribute,
        };
        if (move.die) {
          const r = resolveAttack(atk, def, move, rng);
          Object.assign(event, r);
          if (r.hit) {
            def.currentHealth = Math.max(0, def.currentHealth - r.damage);
            if (r.shield) delete def.tokens.shield;
            if (negative && def.currentHealth > 0) event.appliedEffect = applyEffect(def, move.effect, rng);
          }
        } else if (negative) {
          // Support with a negative effect: rolls to hit against the target.
          const hitRoll = roll(10, rng);
          const hit = hitRoll >= effectiveAgility(def);
          Object.assign(event, { hit, hitRoll, damage: 0 });
          if (hit) event.appliedEffect = applyEffect(def, move.effect, rng);
        }
        // Positive effect (support or alongside damage): on itself, when the move is used, no hit roll.
        if (POSITIVE_EFFECTS.includes(move.effect)) event.appliedEffect = applyEffect(atk, move.effect, rng);
        event.targetHealthAfter = def.currentHealth;
        if (record) log.push(event);

        if (def.currentHealth <= 0) {
          winner = current;
          reason = 'KO';
          break;
        }
      }
    }

    // Poison: at the end of each turn of the poisoned side.
    if (has(atk, 'poison')) {
      atk.currentHealth = Math.max(0, atk.currentHealth - 1);
      if (record) log.push({ turn, side: current, type: 'poison', healthAfter: atk.currentHealth });
      if (atk.currentHealth <= 0) {
        winner = target;
        reason = 'KO';
        break;
      }
    }
    current = target;
  }

  return {
    winner,
    reason,
    turns: turn,
    healthLeft: { a: cards.a.currentHealth, b: cards.b.currentHealth },
    log,
  };
}

module.exports = {
  DEFAULT_SEED,
  AGILITY_CAP,
  HEALTH_CAP,
  NEGATIVE_EFFECTS,
  POSITIVE_EFFECTS,
  TOKEN_EFFECTS,
  createRng,
  roll,
  hitChance,
  typeEffect,
  has,
  effectiveAgility,
  tokenAdjustment,
  moveAttribute,
  computeDamage,
  resolveAttack,
  applyEffect,
  availableMoves,
  cloneCard,
  battle,
};
