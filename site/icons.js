/* Icon map for the cards. Each entry is a complete SVG, simple stroke, 24 x 24,
   color = currentColor (the CSS sets color and size).
   To swap an icon later, replace the SVG of the matching key.
   A key missing from the map falls back to the placeholder (neutral geometric shape).
   Groups: type (creature types and resistances), move, attribute, track, effect, die, symbol ("+"), general.
   No padlock: a locked move is an empty square; an unlocked one is a square with "checked".
   See docs/design-system.md. */
(function () {
  'use strict';

  function svg(body) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  // Drawings reused in more than one group.
  var BOLT = '<path d="M13 2.5 5.5 13.5H12l-1 8 7.5-11H12z"/>';
  var FLAME = '<path d="M12 3c1.5 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.2 1-3.8 2.3-5 .2 1.8 1 2.8 2.2 3.2C10.6 9.5 10.8 6 12 3z"/>';
  var DROP = '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>';
  var LEAF = '<path d="M5 19C4.5 10 9.5 5 20 4c.5 10-4.5 15-15 15z"/><path d="M5 19l8.5-8.5"/>';
  var MOUNTAIN = '<path d="M2.5 20 9 8.5l4 6.5 2.5-3.5L21.5 20z"/>';
  var SNOWFLAKE = '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>';
  var WING = '<path d="M3 15c3-6 8-8 18-9-2 5-5 9-11 10-3 .5-5 0-7-1z"/>';
  var BUBBLES = '<circle cx="9" cy="15" r="3.5"/><circle cx="16" cy="9.5" r="2.5"/><circle cx="15.5" cy="17.5" r="1.5"/>';
  var EYE = '<path d="M2 12c3-5.5 17-5.5 20 0-3 5.5-17 5.5-20 0z"/><circle cx="12" cy="12" r="2.8"/>';
  var STONE = '<path d="M6 19.5 3 12l4-7 8-1.5 5 5.5-1 8.5-6.5 2.5z"/>';
  var DOT = '<circle cx="12" cy="12" r="8"/>';
  var FIST = '<rect x="5" y="8" width="12" height="10" rx="3.5"/><path d="M9 8V5.5M12.5 8V4.5M15.5 8V5.5M17 12.5h2"/>';
  var STINGER = '<path d="M12 3v7"/><path d="M8 11c0 4 1.8 7 4 10 2.2-3 4-6 4-10z"/>';
  var GHOST = '<path d="M6 21V11a6 6 0 0 1 12 0v10l-2-2-2 2-2-2-2 2-2-2z"/><circle cx="10" cy="11" r="1" fill="currentColor"/><circle cx="14" cy="11" r="1" fill="currentColor"/>';
  var DRAGON = '<path d="M3 17c2-6 6-9 9-9 1 3 4 4 9 3-2 4-5 7-9 7-2 0-4-1-5-1-1 0-2 0-4 0z"/>';
  // Outlined fist, with inner divisions to keep the fingers readable in print.
  var HAND = '<path d="M6.5 11V8.5a2 2 0 0 1 4 0V11M10.5 10V6.5a2 2 0 0 1 4 0V10M14.5 10V7.5a2 2 0 0 1 4 0V12"/>' +
    '<path d="M18.5 10.5a2 2 0 0 1 4 0v3.3a8 8 0 0 1-8 8h-2.2A8.3 8.3 0 0 1 4 13.5V12a2 2 0 0 1 4 0v2"/>' +
    '<path d="M8 12h8a2 2 0 0 1 0 4h-4"/>';
  var STRENGTH = HAND;
  var ENERGY = BOLT;
  // Outlined sneaker in profile, with laces, sole and motion lines.
  var SHOE = '<path d="M10.5 4.5 15 8l-1.8 2.4 2.5 2.3a5 5 0 0 0 3.4 1.3H22v3.5H11.8a5 5 0 0 1-3.9-1.9L5 12"/>' +
    '<path d="M10.5 4.5 5 9.2a1.7 1.7 0 0 0-.2 2.4L8 15.3M12 9.3l2 1.6M10.5 11l2 1.6M11.8 20H22M2 12.5h3M2.5 16h4"/>';
  var AGILITY = SHOE;
  var DEFENSE = '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>';
  var CLAW = '<path d="M7 4c.8 4.5.8 9-1.5 16M12 3c1 5.5 1 10-1 18M17 4c0 5 0 10 1.5 16"/>';
  var PUNCH = FIST;
  var HEART = '<path d="M12 20.5C5.5 16 3 12.5 3 9a4.5 4.5 0 0 1 9-1.2A4.5 4.5 0 0 1 21 9c0 3.5-2.5 7-9 11.5z"/>';
  var STAR = '<path d="M12 3l2.6 6 6.4.4-5 4.2 1.6 6.3L12 16.6 6.4 20 8 13.6 3 9.4 9.4 9z"/>';
  var BULB = '<path d="M9 17.5h6M10 20.5h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>';
  var BURST = '<path d="M12 2l1.5 6L19 5l-3 5.5L22 12l-6 1.5 3 5.5-5.5-3L12 22l-1.5-6L5 19l3-5.5L2 12l6-1.5L5 5l5.5 3z"/>';
  var ARROW_UP = '<path d="M12 21V4M6 10l6-6 6 6"/>';
  var ARROW_DOWN = '<path d="M12 3v17M6 14l6 6 6-6"/>';
  var FORBIDDEN = '<circle cx="12" cy="12" r="8.5"/><path d="M5.6 5.6l12.8 12.8"/>';
  var ALERT = '<path d="M12 4 21.5 20h-19z"/><path d="M12 10v4.5"/><path d="M12 17.3v.1"/>';
  var GEM = '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18"/>';
  var CHECKED = '<path d="M4.5 12.5l5 5L19.5 6.5"/>';

  // Shapes of the dice used in moves: d4, d6, d8 and d12 (rules, section 15).
  // The face is drawn with pips (no number): d4 has 4 pips, d6 has 6, d8 has 8.
  // The pip is filled (fill currentColor), the outline is the icon stroke.
  var PIP = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="currentColor" stroke="none"/>'; };
  var D4 = '<path d="M12 3.5 21 19.5H3z"/>' +
    PIP(12, 9.6, 1.7) + PIP(9.2, 15.4, 1.7) + PIP(14.8, 15.4, 1.7) + PIP(12, 17.6, 1.7);
  var D6 = '<rect x="4" y="4" width="16" height="16" rx="3"/>' +
    PIP(8.5, 8, 2) + PIP(15.5, 8, 2) + PIP(8.5, 12, 2) + PIP(15.5, 12, 2) + PIP(8.5, 16, 2) + PIP(15.5, 16, 2);
  var D8 = '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/>' +
    PIP(15, 5.5, 1.6) + PIP(18.5, 9, 1.6) + PIP(18.5, 15, 1.6) + PIP(15, 18.5, 1.6) +
    PIP(9, 18.5, 1.6) + PIP(5.5, 15, 1.6) + PIP(5.5, 9, 1.6) + PIP(9, 5.5, 1.6);

  var D12 = '<path d="M12 2.5 19.6 6.2 21.5 14.4 16.3 21 7.7 21 2.5 14.4 4.4 6.2z"/>' +
    '<path d="M12 8 16.2 11 14.6 16 9.4 16 7.8 11z"/>';

  // Move effect tokens (move catalog, section 1.5): colored disc with a drawing
  // in ink color. Color helps; the drawing alone already tells each effect apart (B&W printing).
  function token(color, drawing) {
    return '<circle cx="12" cy="12" r="10" fill="' + color + '"/>' +
      '<g transform="translate(4.8 4.8) scale(0.6)">' + drawing + '</g>';
  }
  var FEATHER = '<path d="M20 3C10 3 5 8.5 5 15.5 5 17 5.4 18.5 6 19.5 13 19.5 19.5 14 20 3z"/><path d="M4 21 15 9"/>';
  var ZZ = '<path d="M5 6h7L5 14h7M13 11h6l-6 7h6"/>';
  var TOKENS = {
    weakness: token('#b4b8c2', ARROW_DOWN),
    poison: token('#b27ad8', DROP),
    paralysis: token('#ffd23a', BOLT),
    sleep: token('#6f9cf0', ZZ),
    swift: token('#7fdcea', FEATHER),
    shield: token('#f2a640', DEFENSE),
    extra_strength: token('#ff6b6b', ARROW_UP),
    heal: token('#6fcf8a', HEART)
  };

  // Area: hits several targets (one big circle behind and two in front).
  var AREA = '<circle cx="12" cy="7" r="3"/><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/>' +
    '<path d="M9 11.5 10.5 9.5M15 11.5 13.5 9.5M9.5 16h5" stroke-dasharray="1.5 2.2"/>';

  // Plus sign between the die and the attribute ("+ Strength"). A symbol, not a number.
  var PLUS = '<path d="M12 5v14M5 12h14" stroke-width="3"/>';

  var PLACEHOLDER = svg('<rect x="5" y="5" width="14" height="14" rx="3" stroke-dasharray="3 2.5"/>');

  var MAP = {
    type: {
      electric: BOLT,
      fire: FLAME,
      water: DROP,
      plant: LEAF,
      earth: MOUNTAIN,
      ice: SNOWFLAKE,
      air: WING,
      poison: BUBBLES,
      psychic: EYE,
      stone: STONE,
      normal: DOT,
      fighter: FIST,
      insect: STINGER,
      ghost: GHOST,
      dragon: DRAGON
    },
    move: {
      bolt: BOLT,
      claw: CLAW,
      punch: PUNCH,
      drop: DROP,
      flame: FLAME,
      leaf: LEAF,
      frost: SNOWFLAKE,
      snowflake: SNOWFLAKE,
      soil: MOUNTAIN,
      stone: STONE,
      poison: BUBBLES,
      eye: EYE,
      fist: FIST,
      bubbles: BUBBLES,
      mountain: MOUNTAIN,
      wing: WING,
      stinger: STINGER,
      dot: DOT
    },
    attribute: {
      strength: STRENGTH,
      energy: ENERGY,
      agility: AGILITY,
      defense: DEFENSE
    },
    track: {
      skill: BULB,
      star: STAR,
      heart: HEART,
      strength: STRENGTH,
      power: BURST,
      evolution: ARROW_UP
    },
    effect: {
      resistant: ARROW_DOWN,
      immune: FORBIDDEN,
      vulnerable: ALERT,
      weakness: TOKENS.weakness,
      poison: TOKENS.poison,
      paralysis: TOKENS.paralysis,
      sleep: TOKENS.sleep,
      swift: TOKENS.swift,
      shield: TOKENS.shield,
      extra_strength: TOKENS.extra_strength,
      heal: TOKENS.heal
    },
    die: {
      d4: D4,
      d6: D6,
      d8: D8,
      d12: D12
    },
    symbol: {
      plus: PLUS
    },
    general: {
      heart: HEART,
      item: GEM,
      area: AREA,
      hand: HAND,
      shoe: SHOE,
      checked: CHECKED
    }
  };

  // Cache of the SVGs already built (each entry becomes svg(...) once).
  var CACHE = {};

  window.ICONS = {
    // Returns the icon SVG (string), or the placeholder if the key does not exist.
    get: function (group, name) {
      var drawing = (MAP[group] || {})[name];
      if (!drawing) return PLACEHOLDER;
      var key = group + ':' + name;
      if (!CACHE[key]) CACHE[key] = svg(drawing);
      return CACHE[key];
    },
    // Die shape from the notation (e.g. "d6" or "1d6" -> d6). Only d4, d6, d8 and d12; others give null.
    die: function (notation) {
      var m = /d(\d+)/i.exec(String(notation || ''));
      if (!m) return null;
      var shape = 'd' + m[1];
      return MAP.die[shape] ? shape : null;
    },
    placeholder: PLACEHOLDER
  };
})();
