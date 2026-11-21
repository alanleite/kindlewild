// Pure Kindlewild rules. No Foundry dependency: tested with node --test.

export const HEALTH_CAP = 24;
export const TRACK = 70;
export const AGILITY_CAP = 8;

export function maxHealth(base, marks, progress) {
  const hearts = marks.filter((m) => m.kind === 'heart' && m.pos <= progress).length;
  return Math.min(HEALTH_CAP, base + hearts);
}

export function rest(value, max) {
  return Math.min(max, value + Math.ceil(max / 2));
}

export function nextClickValue(current, index, max) {
  return index <= current ? index - 1 : Math.min(max, index);
}

export function isUnlimited(move) {
  return move.order === 1 || move.charges?.max == null;
}

export function canUse(move) {
  if (move.order !== 1 && !move.unlocked) return { ok: false, reason: 'locked' };
  if (!isUnlimited(move) && (move.charges.value ?? 0) <= 0) return { ok: false, reason: 'no-charges' };
  return { ok: true, reason: null };
}

export function damageFormula(move, attributes) {
  if (!move.die) return null;
  const a = move.attribute ? attributes[move.attribute] : null;
  const bonus = a ? (a.base ?? 0) + (a.stars ?? 0) : 0;
  return `1${move.die} + ${bonus}`;
}

export function targetReference(target, element) {
  if (!target) return { agility: '—', defense: '—', resistance: '—' };
  const agility = target.attributes?.agility;
  const defense = target.attributes?.defense;
  const agi = Math.min(AGILITY_CAP, (agility?.base ?? 0) + (agility?.stars ?? 0));
  const def = (defense?.base ?? 0) + (defense?.stars ?? 0);
  return { agility: String(agi), defense: String(def), resistance: target.resistances?.[element] ?? '—' };
}

export function healthAfterProgress(base, marks, progress, currentValue) {
  return Math.min(currentValue, maxHealth(base, marks, progress));
}
