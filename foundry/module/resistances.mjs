// Mirrors site/resistances.js so the installed system is self-contained.
export function normalizeResistances(map) {
  const result = {}, counts = { resistant: 0, vulnerable: 0 };
  for (const type of Object.keys(map || {})) {
    const effect = map[type] === 'immune' ? 'resistant' : map[type];
    if (!Object.prototype.hasOwnProperty.call(counts, effect) || counts[effect] >= 3) continue;
    result[type] = effect;
    counts[effect]++;
  }
  return result;
}
