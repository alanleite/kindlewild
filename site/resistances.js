(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Resistances = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Old data can contain immunities or more than three entries in each group.
  // Preserve the data order, convert immunities, and use only what the card shows.
  function normalize(map) {
    var result = {}, counts = { resistant: 0, vulnerable: 0 };
    Object.keys(map || {}).forEach(function (type) {
      var effect = map[type] === 'immune' ? 'resistant' : map[type];
      if (!Object.prototype.hasOwnProperty.call(counts, effect) || counts[effect] >= 3) return;
      result[type] = effect;
      counts[effect]++;
    });
    return result;
  }
  return { normalize: normalize };
}));
