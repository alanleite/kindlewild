'use strict';

// Builds the combat card from the scenario's creatures (scenarios/<id>/creatures.json), for a progress (0 to 70) and a star policy.

const { distributeStars, listStarPolicies } = require('./policy');

const scenario = require('../lib/scenario');

const DEFAULT_DATA = scenario.creatures();

const ATTRIBUTES = ['strength', 'energy', 'agility', 'defense'];
const SIDES = { d4: 4, d6: 6, d8: 8, d12: 12 };
const HEALTH_CAP = 16;

// Converts a move (new or legacy format) to the new format.
// Legacy: type -> element; category physical/elemental -> attribute strength/energy; uses -> charges.
function normalizeMove(m) {
  const legacy = m.category !== undefined || m.type !== undefined || m.uses !== undefined;
  const element = m.element !== undefined ? m.element : (m.type !== undefined ? m.type : 'normal');
  let attribute = m.attribute;
  if (attribute === undefined) {
    if (m.category === 'physical') attribute = 'strength';
    else if (m.category === 'elemental') attribute = 'energy';
    else attribute = m.die ? 'strength' : null;
  }
  let charges = m.charges !== undefined ? m.charges : (m.uses !== undefined ? m.uses : null);
  if (charges === undefined) charges = null;
  const die = m.die === undefined ? null : m.die;
  if (die !== null && !SIDES[die]) throw new Error(`Invalid die in move "${m.name}": ${die}`);
  return {
    name: m.name,
    icon: m.icon,
    element,
    attribute,
    die,
    sides: die ? SIDES[die] : null,
    charges,
    effect: m.effect === undefined ? null : m.effect,
    area: Boolean(m.area),
    unlocked_at: m.unlocked_at,
    legacyFormat: legacy && m.element === undefined,
  };
}

function normalize(text) {
  return String(text)
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Accepts a name (accents and case ignored) or the creature number.
function findSpecies(ref, list = DEFAULT_DATA) {
  const text = String(ref).trim();
  if (/^\d+$/.test(text)) {
    const found = list.find((s) => s.id === Number(text));
    if (found) return found;
  }
  const key = normalize(text);
  const found = list.find((s) => normalize(s.name) === key);
  if (!found) throw new Error(`Species not found: "${ref}". Use the card name or the creature number (run.js --list shows all).`);
  return found;
}

function count(species, kind, p) {
  return species.track.filter((m) => m.kind === kind && m.pos <= p).length;
}

// Species that evolves into this one (the previous form in the line).
function findPrevious(species, list) {
  return list.find((s) => (s.evolutions || []).some((ev) => ev.into === species.name)) || null;
}

// Attributes at point `p` of the track. Base form: the species' base. Evolved form (attributes null):
// copies the current value of each attribute of the previous form at the moment of evolution (`evolution` mark),
// with no +1. Slots of evolved forms come from the number of star marks (4 × slots).
function attributesAt(species, p, policy, list) {
  let base;
  let slots;
  if (species.attributes) {
    base = {};
    slots = {};
    for (const a of ATTRIBUTES) {
      base[a] = Math.max(0, species.attributes[a].base);
      slots[a] = species.attributes[a].slots;
    }
  } else {
    const previous = findPrevious(species, list);
    if (!previous) throw new Error(`${species.name}: no attributes and no previous form to inherit from.`);
    const pEvo = previous.evolutions.find((ev) => ev.into === species.name).pos;
    const previousValue = attributesAt(previous, pEvo, policy, list);
    base = {};
    slots = {};
    // Slots of an inherited form = slots of the line's root form (same convention as the track generator).
    let root = previous;
    while (root && root.inherits_attributes) root = findPrevious(root, list);
    if (!root || !root.attributes) throw new Error(`${species.name}: root form has no stored attributes.`);
    for (const a of ATTRIBUTES) {
      base[a] = previousValue[a].value;
      slots[a] = root.attributes[a].slots;
    }
  }

  const totalCapacity = ATTRIBUTES.reduce((s, a) => s + slots[a], 0);
  const available = Math.min(count(species, 'star', p), totalCapacity);
  const stars = distributeStars(available, slots, policy);
  const automatic = { strength: count(species, 'strength', p), energy: 0, agility: 0, defense: 0 };

  const result = {};
  for (const a of ATTRIBUTES) {
    result[a] = {
      base: base[a],
      slots: slots[a],
      stars: stars[a],
      automatic: automatic[a],
      value: Math.max(0, base[a] + stars[a] + automatic[a]),
    };
  }
  return result;
}

// buildCard(species, options) -> combat card
// options.progress: 0 to 70 (default 70). Marks with pos <= progress are already done.
// options.stars: 'even' | 'strength' | 'agility' (default 'even')
// options.list: species list, to resolve evolutions (default: the scenario's creatures)
function buildCard(species, options = {}) {
  const p = options.progress === undefined ? 70 : options.progress;
  if (!Number.isInteger(p) || p < 0 || p > 70) throw new Error(`Invalid progress: ${p}. Use an integer from 0 to 70.`);
  const policy = options.stars || 'even';
  if (!listStarPolicies().includes(policy)) {
    throw new Error(`Unknown star policy: "${policy}". Use: ${listStarPolicies().join(', ')}.`);
  }
  const list = options.list || DEFAULT_DATA;

  const attributes = attributesAt(species, p, policy, list);
  const hearts = count(species, 'heart', p);
  const maxHealth = Math.min(HEALTH_CAP, species.health + hearts);

  const skillMarks = species.track.filter((m) => m.kind === 'skill').sort((x, y) => x.pos - y.pos);
  const moves = species.moves.map((raw, i) => {
    const m = normalizeMove(raw);
    // Skill mark: new format (detail = move number 1..4), legacy format (detail = name),
    // otherwise the i-th mark in position order. No mark: unlocked_at (position, legacy format only).
    let mark = skillMarks.find((k) => k.detail === m.name || k.detail === i + 1);
    if (!mark && !m.legacyFormat) mark = skillMarks[i];
    const unlockPos = mark ? mark.pos : (m.legacyFormat ? m.unlocked_at : 0);
    // The first move starts unlocked (section 4 of the rules).
    const unlocked = i === 0 || unlockPos <= p;
    const bonus = unlocked && m.die
      ? species.track.filter((k) => k.kind === 'power' && (k.detail === m.name || k.detail === i + 1) && k.pos <= p).length
      : 0;
    // Move 1 is always unlimited.
    const charges = i === 0 ? null : m.charges;
    return {
      name: m.name,
      icon: m.icon,
      element: m.element,
      attribute: m.attribute,
      die: m.die,
      sides: m.sides,
      charges,
      chargesLeft: charges,
      effect: m.effect,
      area: m.area,
      unlocked,
      bonus,
    };
  });

  return {
    id: species.id,
    name: species.name,
    progress: p,
    starPolicy: policy,
    types: species.types,
    maxHealth,
    currentHealth: maxHealth,
    attributes,
    moves,
    tokens: {},
    resistances: species.resistances || {},
    marks: {
      hearts,
      starsDone: ATTRIBUTES.reduce((s, a) => s + attributes[a].stars, 0),
      skillsUnlocked: moves.filter((m) => m.unlocked).length - 1,
      powers: moves.reduce((s, m) => s + m.bonus, 0),
    },
  };
}

// Synthetic card for engine tests (no JSON).
function buildSyntheticCard(options = {}) {
  const attr = (value) => ({ base: value, slots: 0, stars: 0, automatic: 0, value });
  const moves = (options.moves || [{}]).map((raw, i) => {
    // Test default: unlimited normal physical d6. An explicit `die: null` creates a support move.
    const m = normalizeMove({
      name: raw.name || `Move ${i + 1}`,
      icon: 'dot',
      ...raw,
      die: raw.die === undefined ? 'd6' : raw.die,
    });
    return {
      name: m.name,
      icon: m.icon,
      element: m.element,
      attribute: m.attribute,
      die: m.die,
      sides: m.sides,
      charges: m.charges,
      chargesLeft: m.charges,
      effect: m.effect,
      area: m.area,
      unlocked: true,
      bonus: raw.bonus || 0,
    };
  });
  const maxHealth = options.health === undefined ? 10 : options.health;
  return {
    id: 0,
    name: options.name || 'Synthetic',
    progress: 0,
    starPolicy: 'none',
    types: options.types || ['normal'],
    maxHealth,
    currentHealth: maxHealth,
    attributes: {
      strength: attr(options.strength || 0),
      energy: attr(options.energy || 0),
      agility: attr(options.agility || 0),
      defense: attr(options.defense || 0),
    },
    moves,
    tokens: {},
    resistances: options.resistances || {},
    marks: { hearts: 0, starsDone: 0, skillsUnlocked: 0, powers: 0 },
  };
}

module.exports = {
  DEFAULT_DATA,
  ATTRIBUTES,
  normalize,
  normalizeMove,
  HEALTH_CAP,
  findSpecies,
  buildCard,
  buildSyntheticCard,
  listStarPolicies,
};
