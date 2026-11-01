(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CardView = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DICE = { d4: true, d6: true, d8: true, d12: true };
  var EFFECTS = ['weakness', 'poison', 'paralysis', 'sleep', 'swift', 'shield', 'extra_strength', 'heal'];
  var ATTRIBUTES = ['strength', 'energy'];
  var CHARGES = [1, 2, 3];
  // Legacy format (type/category/uses), accepted during the transition.
  var LEGACY_CATEGORY = { physical: 'strength', elemental: 'energy' };

  function dieLabel(die) {
    return typeof die === 'string' && Object.prototype.hasOwnProperty.call(DICE, die) ? die : null;
  }

  function headerTypes(types) {
    return (Array.isArray(types) ? types : []).filter(Boolean).slice(0, 2);
  }

  // Move in the new format (element, attribute, die, charges, effect, area), from the new or the legacy one.
  function normalizeMove(m) {
    m = m || {};
    var isNew = 'element' in m || 'attribute' in m || 'charges' in m || 'effect' in m || 'area' in m;
    var attribute = isNew ? m.attribute : LEGACY_CATEGORY[m.category];
    var charges = 'charges' in m ? m.charges : m.uses;
    return {
      name: m.name || '',
      icon: m.icon,
      element: m.element || m.type || 'normal',
      attribute: attribute === undefined ? null : attribute,
      die: m.die === undefined ? null : m.die,
      charges: charges === undefined ? null : charges,
      effect: m.effect === undefined ? null : m.effect,
      area: m.area === true,
      legacy: !isNew
    };
  }

  // Problems of a move (already normalized) against the move catalog.
  function moveProblems(m) {
    var p = [];
    var name = m.name || '(no name)';
    if (m.die === null) {
      if (m.attribute !== null) p.push(name + ': support move has no attribute');
      if (!m.effect) p.push(name + ': support move needs an effect');
    } else {
      if (!dieLabel(m.die)) p.push(name + ': die ' + m.die + ' (only d4, d6, d8 and d12)');
      if (ATTRIBUTES.indexOf(m.attribute) < 0) p.push(name + ': attribute ' + m.attribute + ' (strength or energy)');
    }
    if (m.charges !== null && CHARGES.indexOf(m.charges) < 0) p.push(name + ': charges ' + m.charges + ' (3, 2, 1 or unlimited)');
    if (m.effect !== null && EFFECTS.indexOf(m.effect) < 0) p.push(name + ': unknown effect ' + m.effect);
    return p;
  }

  return {
    normalizeMove: normalizeMove,
    moveProblems: moveProblems,
    EFFECTS: EFFECTS,
    dieLabel: dieLabel,
    headerTypes: headerTypes
  };
}));
