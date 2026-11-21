#!/usr/bin/env node
/* Builds the card print PDFs with direct vector drawing (PDFKit), no browser.

   Reads the scenario's creatures (scenarios/<id>/creatures.json; default in scenarios/default.txt or
   KINDLEWILD_SCENARIO). Outputs (in scenarios/<id>/print/):
     cards-front.pdf   one A4 sheet per group of 4 cards, front only
     cards-back.pdf    one A4 sheet per group, back only (track), mirrored columns
     cards-A4.pdf      front and back interleaved: sheet 1 front, sheet 1 back, sheet 2 front...

   Usage: node scripts/build-pdf.js [options]   (or: npm run build -- [options])
   Options:
     --margin <mm>          printer's non-printable margin on each side (default 4)
     --cuts on|off          cut marks (corners and edge midpoints, outside the card) (default on)
     --registration on|off  registration marks (crosses in the margin, used by check-alignment.js) (default on)
     --mirror on|off        mirror the back columns (default on)
     --ids <list>           species filter, e.g. 1-12 or 1,4,25-30 (default: all)
     --unlocked <n>         moves unlocked on the front, from 1 to 4 (default 1)
     --font <file>          TrueType font (default: macOS Arial Bold, has ♀ and ♂)
     --out <dir>            output folder (default: scenarios/<id>/print/)
     --help                 shows this text

   Mirroring rule (two-sided printing, flipping the sheet on the long edge):
     card in column 1 on the front -> column 2 on the back, and card in column 2 -> column 1.
     In the 2 x 2 grid: front slots 0,1,2,3 go to back slots 1,0,3,2.

   Geometry: the 2 x 2 grid of A6 cards (105 x 148.5 mm) fills exactly the A4 (210 x 297 mm).
   To fit margin and marks, the whole grid is reduced by a single factor s, centered:
     inset = margin + 3.2 mm (mark band, if cuts or registration are on)
     s = min((210 - 2 x inset) / 210, (297 - 2 x inset) / 297)
   With margin 4 and marks on, s = 0.931 (cards of ~97.7 x 138.3 mm). For exact A6 use
   --margin 0 --cuts off --registration off (no marks and no margin, the printer clips the edges).
   Every drawing coordinate is in mm; there is no rounding to pixels.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');

const ROOT = path.resolve(__dirname, '..');
const scenario = require(path.join(ROOT, 'lib', 'scenario'));
const DATA_FILE = path.join(scenario.dir(), 'creatures.json');
const OUT_DIR = path.join(scenario.dir(), 'print');
const DEFAULT_FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
let FONT = DEFAULT_FONT; // set in main() from --font

// Reuses the site rules (read only): enlarged images, back mirroring, grouping, die notation.
const SITE = path.join(ROOT, 'site');
const ImageScale = require(path.join(SITE, 'image-scale.js'));
const PrintSelection = require(path.join(SITE, 'print-selection.js'));
const CardView = require(path.join(SITE, 'card-view.js'));

// Icons: site/icons.js is a browser script that sets window.ICONS. Run in an isolated context.
function loadIcons() {
  const code = fs.readFileSync(path.join(SITE, 'icons.js'), 'utf8');
  const win = {};
  vm.runInNewContext(code, { window: win });
  return win.ICONS;
}
const ICONS = loadIcons();

// ---------------------------------------------------------------- constants (mm, as in the CSS)

const MM = 72 / 25.4;               // points per mm (PDF)
const A4 = { w: 210, h: 297 };
const CARD = { w: 105, h: 148.5 };
const PER_SHEET = 4;
const TRACK = { columns: 7, rows: 10, size: 70, box: 10, gap: 4 };
const LEGACY_TRACK = 50;            // legacy format (docs/track-generation.md, section 10.1)
const MAX_HEALTH = 24;
const MOVES = 4;
const MARK_BAND = 3.2;              // band outside the grid reserved for the marks
const ASC = 0.905, DESC = 0.212;    // Arial Bold ascender and descender (per em), to center text
const CAP_HEIGHT = 0.716;           // cap height (not used for centering; reference)

const INK = '#000000';
const PAPER = '#ffffff';
const CUT_LINE = '#9aa1ad';         // color-line-soft in print
const HEART = '#e0313a';
const DEFAULT_TYPE = '#c4c4b4';
const TYPE_COLOR = {
  electric: '#f7c600', fire: '#f0622a', water: '#3b8ee6', plant: '#3ea650', earth: '#b98b52',
  ice: '#7fd8ea', air: '#9bb8ef', poison: '#9a4fc4', psychic: '#e95b9a', stone: '#a9a17e',
  normal: '#c4c4b4', fighter: '#c8553d', insect: '#9bc23c', ghost: '#6f5ea8', dragon: '#5b4fd8'
};
const MARK_COLOR = {
  skill: '#bfd9ff', star: '#ffe98a', heart: '#ffc4c7',
  strength: '#ffd2b0', power: '#dcc3f2', evolution: '#bfe9c9'
};
const ATTRIBUTE_ORDER = ['strength', 'energy', 'agility', 'defense'];
const MOVE_ATTRIBUTE = { physical: 'strength', elemental: 'energy' };
const EFFECT_PRIORITY = { vulnerable: 0, immune: 1, resistant: 2 };
const MAX_CHIPS = 3;

// ---------------------------------------------------------------- utilities

function integer(value, min) {
  return Math.max(min, Math.floor(Number(value) || 0));
}

function evolutionList(p) {
  if (Array.isArray(p.evolutions)) return p.evolutions;
  return p.evolutions ? [p.evolutions] : [];
}

function typeColor(type) {
  return TYPE_COLOR[type] || DEFAULT_TYPE;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

// Same as CSS color-mix(in srgb, color pct%, white).
function mixWithWhite(hex, pct) {
  const a = hexToRgb(hex);
  return rgbToHex(a.map(v => Math.round(v * pct + 255 * (1 - pct))));
}

// Icon SVG with the print colors. currentColor becomes the ink color; fill replaces the fill of the
// root element (used on the heart); stroke replaces the root stroke-width (used on the unlocked check).
function iconSvg(group, name, opts) {
  const o = opts || {};
  let svg = ICONS.get(group, name);
  svg = svg.split('currentColor').join(o.color || INK);
  if (o.fill) svg = svg.replace(' fill="none"', ' fill="' + o.fill + '"');
  if (o.stroke) svg = svg.replace('stroke-width="1.8"', 'stroke-width="' + o.stroke + '"');
  return svg;
}

function drawIcon(doc, group, name, x, y, side, opts) {
  SVGtoPDF(doc, iconSvg(group, name, opts), x, y, { width: side, height: side });
}

// Box with the border inside (like CSS box-sizing: border-box). Stroke centered at bw/2.
function box(doc, x, y, w, h, r, o) {
  const bw = o.bw || 0;
  const i = bw / 2;
  doc.save();
  if (bw > 0 && o.border) {
    doc.lineWidth(bw);
    doc.roundedRect(x + i, y + i, w - bw, h - bw, Math.max(0, r - i));
    if (o.fill) doc.fillAndStroke(o.fill, o.border);
    else doc.stroke(o.border);
  } else if (o.fill) {
    doc.roundedRect(x, y, w, h, r).fill(o.fill);
  }
  doc.restore();
}

// Circle with the border inside. radius is the outer radius.
function circle(doc, cx, cy, radius, o) {
  const bw = o.bw || 0;
  doc.save();
  if (bw > 0 && o.border) {
    doc.lineWidth(bw);
    doc.circle(cx, cy, radius - bw / 2);
    if (o.fill) doc.fillAndStroke(o.fill, o.border);
    else doc.stroke(o.border);
  } else if (o.fill) {
    doc.circle(cx, cy, radius).fill(o.fill);
  }
  doc.restore();
}

// Text with the baseline at y (alphabetic). x is the left edge.
function text(doc, str, x, baseline, size) {
  doc.font(FONT).fontSize(size).fillColor(INK);
  doc.text(str, x, baseline, { lineBreak: false, baseline: 'alphabetic' });
}

// Text centered on cx and vertically centered on cy (like CSS flex center).
// maxWidth shrinks the size proportionally if the text does not fit.
function centeredText(doc, str, cx, cy, size, maxWidth) {
  let t = size;
  doc.font(FONT).fontSize(t);
  const w0 = doc.widthOfString(str);
  if (maxWidth && w0 > maxWidth) t = size * maxWidth / w0;
  doc.font(FONT).fontSize(t);
  const w = doc.widthOfString(str);
  const baseline = cy + ((ASC - DESC) / 2) * t;
  text(doc, str, cx - w / 2, baseline, t);
}

// Wraps into at most maxLines lines within width (mm). Truncates with an ellipsis, like line-clamp.
function wrapLines(doc, str, width, maxLines) {
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(function (p) {
    const attempt = current ? current + ' ' + p : p;
    if (!current || doc.widthOfString(attempt) <= width) current = attempt;
    else { lines.push(current); current = p; }
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const cut = lines.slice(0, maxLines);
  let last = cut[maxLines - 1];
  while (last.length && doc.widthOfString(last + '…') > width) last = last.slice(0, -1);
  cut[maxLines - 1] = last.trimEnd() + '…';
  return cut;
}

// ---------------------------------------------------------------- data

function computeChain(species) {
  const parent = {};
  species.forEach(function (p) {
    evolutionList(p).forEach(function (e) { if (e && e.into) parent[e.into] = p.name; });
  });
  const stages = {};
  function stageOf(name, guard) {
    if (stages[name]) return stages[name];
    if (!parent[name] || guard > 5) return 1;
    return Math.min(3, stageOf(parent[name], guard + 1) + 1);
  }
  species.forEach(function (p) { stages[p.name] = stageOf(p.name, 0); });
  return { stages: stages, previous: parent };
}

// Evolved form (attributes null): slots by stage (section 5 of the rules).
function derivedSlots(p, chain) {
  const hasEvolution = evolutionList(p).length > 0;
  const hasPrevious = !!chain.previous[p.name];
  if (hasPrevious) return hasEvolution ? 3 : 4;
  return hasEvolution ? 2 : 4;
}

function formAttributes(p, chain) {
  const out = {};
  ATTRIBUTE_ORDER.forEach(function (k) {
    const a = p.attributes && p.attributes[k] ? p.attributes[k] : null;
    if (a) out[k] = { base: Math.max(0, Number(a.base) || 0), slots: integer(a.slots, 0), inherited: false };
    else out[k] = { base: 0, slots: derivedSlots(p, chain), inherited: true };
  });
  return out;
}

function imagePath(p) {
  if (!p.image) return null;
  return scenario.imagePath(p);
}

// Data warnings. They do not change the JSON. They never stop the build.
function checkData(species) {
  const warnings = [];
  const legacy = species.filter(function (p) {
    const pos = (p.track || []).map(function (m) { return Number(m.pos); });
    return pos.length && Math.max.apply(null, pos) <= LEGACY_TRACK;
  });
  if (legacy.length) {
    warnings.push('track in the legacy format (' + LEGACY_TRACK + ' boxes) in ' + legacy.length +
      ' species: ' + legacy.slice(0, 5).map(function (p) { return p.name; }).join(', ') +
      (legacy.length > 5 ? ' ...' : '') + '. The new rule is ' + TRACK.size +
      ' (docs/track-generation.md, section 10.1). Building anyway.');
  }
  species.forEach(function (p) {
    const pos = (p.track || []).map(function (m) { return Number(m.pos); });
    if (pos.some(function (q) { return q > TRACK.size || q < 1; })) warnings.push(p.name + ': mark outside 1 to ' + TRACK.size + '.');
    if (new Set(pos).size !== pos.length) warnings.push(p.name + ': repeated position on the track.');
    if ((p.moves || []).length !== MOVES) warnings.push(p.name + ': ' + (p.moves || []).length + ' moves (expected ' + MOVES + ').');
    if (integer(p.health, 0) + (p.track || []).filter(m => m.kind === 'heart').length > MAX_HEALTH) warnings.push(p.name + ': total hearts above ' + MAX_HEALTH + '.');
    (p.moves || []).forEach(function (m) {
      if (!CardView.dieLabel(m.die)) warnings.push(p.name + ': move ' + m.name + ' with die ' + m.die + ' (only d4, d6 and d8).');
    });
  });
  return warnings;
}

// ---------------------------------------------------------------- card: base, front and back

function cardBase(doc) {
  doc.save();
  doc.rect(0, 0, CARD.w, CARD.h).fill(PAPER);
  // Neutral cut line (0.35 mm inset box-shadow in the CSS). The front top covers the line (see drawFront).
  doc.rect(0.175, 0.175, CARD.w - 0.35, CARD.h - 0.35).lineWidth(0.35).stroke(CUT_LINE);
  doc.restore();
}

function drawFront(doc, p, opts, chain) {
  doc.save();
  doc.rect(0, 0, CARD.w, CARD.h).clip();
  cardBase(doc);

  const types = (p.types || []).filter(Boolean);
  const mainType = types[0] || 'normal';
  const unlocked = opts.unlocked;

  // 1. Top: 59.4 mm (40%). Radial background in the main type color, 35% tint towards white.
  const TOP_H = 59.4;
  doc.save();
  doc.rect(0, 0, CARD.w, TOP_H).clip();
  doc.rect(0, 0, CARD.w, TOP_H).fill(PAPER);
  const cx = 52.5, cy = TOP_H * 0.58;
  const corner = Math.max.apply(null, [[0, 0], [CARD.w, 0], [0, TOP_H], [CARD.w, TOP_H]]
    .map(function (c) { return Math.hypot(c[0] - cx, c[1] - cy); }));
  const radius = corner * 0.72;
  const grad = doc.radialGradient(cx, cy, 0, cx, cy, radius);
  grad.stop(0, mixWithWhite(typeColor(mainType), 0.35)).stop(1, PAPER);
  doc.rect(0, 0, CARD.w, TOP_H).fill(grad);
  doc.restore();

  // Image: 97 x 46.9 mm box at (4; 10.5). Square 475 px artwork, contained in the height, scale from ImageScale.
  const f = ImageScale.get(p);
  const side = 46.9 * f;
  const imgCy = 10.5 + 46.9 / 2;
  const file = imagePath(p);
  if (file && fs.existsSync(file)) {
    doc.image(file, cx - side / 2, imgCy - side / 2, { width: side, height: side });
  } else {
    doc.save();
    doc.lineWidth(0.5).dash(1.2, { space: 1.2 }).circle(cx, imgCy, 15).stroke(CUT_LINE);
    doc.undash();
    doc.restore();
    console.warn('WARNING: image not found for ' + p.name + ': ' + p.image);
  }

  // Name band: 97 x 8 mm at (4; 2.5), 0.3 mm border, 2.4 mm radius, 5.4 mm text (bold).
  box(doc, 4, 2.5, 97, 8, 2.4, { fill: PAPER, border: INK, bw: 0.3 });
  centeredText(doc, p.name || '', cx, 6.5, 5.4, 97 - 2 * 15 - 0.6);

  // Header types: 6.4 mm discs at (4.8; 3.3), 7.1 mm step, up to 2.
  CardView.headerTypes(p.types).forEach(function (t, i) {
    const x = 4.8 + i * 7.1, y = 3.3;
    circle(doc, x + 3.2, y + 3.2, 3.2, { fill: typeColor(t), border: INK, bw: 0.3 });
    drawIcon(doc, 'type', t, x + 1.1, y + 1.1, 4.2);
  });

  // Stage: 1 to 3 dots of 3 mm, at (4; 54.9), 4 mm step.
  const stage = chain.stages[p.name] || 1;
  for (let s = 1; s <= 3; s++) {
    const x = 4 + (s - 1) * 4, y = 54.9;
    if (s <= stage) circle(doc, x + 1.5, y + 1.5, 1.5, { fill: INK });
    else circle(doc, x + 1.5, y + 1.5, 1.5, { fill: PAPER, border: INK, bw: 0.4 });
  }

  // Resistances: up to 3 chips of 5.75 mm, in the bottom right corner of the image (1.2 mm gap).
  const map = p.resistances || {};
  const chips = Object.keys(map)
    .filter(function (t) { return EFFECT_PRIORITY[map[t]] !== undefined; })
    .sort(function (a, b) { return EFFECT_PRIORITY[map[a]] - EFFECT_PRIORITY[map[b]]; })
    .slice(0, MAX_CHIPS);
  const chipsWidth = chips.length * 5.75 + Math.max(0, chips.length - 1) * 1.2;
  const x0Chips = 102 - chipsWidth;
  chips.forEach(function (type, i) {
    const x = x0Chips + i * (5.75 + 1.2), y = 56.9 - 5.75;
    circle(doc, x + 2.875, y + 2.875, 2.875, { fill: typeColor(type), border: INK, bw: 0.3 });
    drawIcon(doc, 'type', type, x + 0.9, y + 0.9, 3.95);
    // effect symbol: 2.4 mm white disc, centered on the chip's bottom right corner
    const ax = x + 5.35, ay = y + 5.35;
    circle(doc, ax, ay, 1.2, { fill: PAPER, border: INK, bw: 0.25 });
    drawIcon(doc, 'effect', map[type], ax - 0.65, ay - 0.65, 1.3, { color: INK });
  });

  // 2. Health: starting hearts plus outlined track rewards, twelve per row.
  const health = integer(p.health, 0);
  const future = (p.track || []).filter(m => m.kind === 'heart').length;
  const x0Health = (105 - 78.8) / 2, y0Health = 65;
  for (let k = 0; k < Math.min(health + future, MAX_HEALTH); k++) {
    const col = k % 12, row = Math.floor(k / 12);
    drawIcon(doc, 'general', 'heart', x0Health + col * 6.6, y0Health + row * 8, 6.2,
      k < health ? { color: HEART, fill: HEART } : { color: HEART });
  }

  // 3. Attributes: 4 columns of 24 mm at x = 3, 28, 53, 78; 10 mm icon at y = 88.4; 2.6 mm boxes at y = 98.9.
  const values = formAttributes(p, chain);
  ATTRIBUTE_ORDER.forEach(function (k, i) {
    const a = values[k];
    const x0 = 3 + i * 25;
    drawIcon(doc, 'attribute', k, x0 + 7, 88.4, 10);
    const filled = Math.min(a.base, a.slots);
    const gap = 0.3;
    const side = Math.max(0.5, Math.min(2.6, (24 - Math.max(0, a.slots - 1) * gap) / Math.max(1, a.slots)));
    const total = a.slots * side + Math.max(0, a.slots - 1) * gap;
    let x = x0 + 12 - total / 2;
    for (let j = 0; j < a.slots; j++) {
      box(doc, x, 98.9, side, side, 0.45, { fill: j < filled ? INK : PAPER, border: INK, bw: 0.35 });
      x += side + gap;
    }
  });

  // 4. Moves: 4 contiguous rows of 10 mm from y = 105.5. Unlock square, move box, columns.
  (p.moves || []).slice(0, MOVES).forEach(function (m, idx) {
    const y = 105.5 + idx * 10;
    const isUnlocked = idx < unlocked;
    // unlock square
    box(doc, 3, y, 10, 10, 1.5, { fill: PAPER, border: INK, bw: 0.4 });
    if (isUnlocked) drawIcon(doc, 'general', 'checked', 3 + 1.25, y + 1.25, 7.5, { stroke: 2.6 });
    // move box: x 14.5, width 87.5, radius 2.4, type background at 22% (only if unlocked)
    const moveFill = isUnlocked ? mixWithWhite(typeColor(m.type || 'normal'), 0.22) : PAPER;
    box(doc, 14.5, y, 87.5, 10, 2.4, { fill: moveFill, border: INK, bw: 0.35 });
    // move icon: column 15.5 (10 mm)
    drawIcon(doc, 'move', m.icon, 15.5, y, 10);
    // name: column 26.5 with 37 mm, up to 2 lines of 3.6 mm, line-height 1.05
    const NAME_SIZE = 3.6, LH = 1.05 * NAME_SIZE;
    doc.font(FONT).fontSize(NAME_SIZE);
    const lines = wrapLines(doc, m.name || '', 37, 2);
    const blockTop = (y + 5) - lines.length * LH / 2;
    lines.forEach(function (ln, i) {
      const base = blockTop + i * LH + (LH - (ASC + DESC) * NAME_SIZE) / 2 + ASC * NAME_SIZE;
      text(doc, ln, 26.5, base, NAME_SIZE);
    });
    // die: column 64.5 with 8 mm, text d4 / d6 / d8, 4.5 mm
    const label = CardView.dieLabel(m.die);
    if (label) centeredText(doc, label, 64.5 + 4, y + 5, 4.5);
    else console.warn(m.name + ': die ' + m.die + ' is not valid (only d4, d6 and d8).');
    // "+" and attribute icon (Strength or Energy, by category): columns 73.5 (3 mm) and 77.5 (10 mm)
    const attribute = MOVE_ATTRIBUTE[m.category];
    if (attribute) {
      drawIcon(doc, 'symbol', 'plus', 73.5, y + 3.5, 3);
      drawIcon(doc, 'attribute', attribute, 77.5, y, 10);
    } else {
      console.warn(m.name + ': category ' + m.category + ' without attribute (physical or elemental).');
    }
    // use dots: 12 mm wide, right-aligned (100.5), 4.2 mm step, 3.4 mm diameter
    const uses = m.uses === null || m.uses === undefined ? 0 : integer(m.uses, 0);
    if (uses) {
      const total = uses * 3.4 + (uses - 1) * 0.8;
      let x = 100.5 - total;
      for (let j = 0; j < uses; j++) {
        circle(doc, x + 1.7, y + 5, 1.7, { fill: PAPER, border: INK, bw: 0.35 });
        x += 3.4 + 0.8;
      }
    }
  });

  doc.restore();
}

function drawBack(doc, p) {
  doc.save();
  doc.rect(0, 0, CARD.w, CARD.h).clip();
  cardBase(doc);

  const marks = new Map();
  (p.track || []).forEach(function (m) { marks.set(Number(m.pos), m); });
  const start = integer(p.start, 1) || 1;
  const evolutions = evolutionList(p);
  const L = TRACK.columns, Q = TRACK.box, E = TRACK.gap;
  const width = L * Q + (L - 1) * E;
  const height = TRACK.rows * Q + (TRACK.rows - 1) * E;
  const x0 = (CARD.w - width) / 2, y0 = (CARD.h - height) / 2;

  for (let pos = 1; pos <= TRACK.size; pos++) {
    const idx = pos - 1;
    const x = x0 + (idx % L) * (Q + E), y = y0 + Math.floor(idx / L) * (Q + E);
    const m = marks.get(pos);
    const fill = m && MARK_COLOR[m.kind] ? MARK_COLOR[m.kind] : PAPER;
    const evoItem = m && m.kind === 'evolution' && evolutions.some(function (e) { return Number(e.pos) === pos && e.requires; });
    // box: 10 mm, radius 1.2, border 0.4 (evolution 0.7; "next" is a double border)
    if (pos === start) {
      box(doc, x, y, Q, Q, 1.2, { fill: fill });
      // double border: outer ring (0-0.4 mm) and inner ring (0.8-1.2 mm)
      doc.save();
      doc.lineWidth(0.4).roundedRect(x + 0.2, y + 0.2, Q - 0.4, Q - 0.4, 1.0).stroke(INK);
      doc.lineWidth(0.4).roundedRect(x + 1.0, y + 1.0, Q - 2.0, Q - 2.0, 0.2).stroke(INK);
      doc.restore();
    } else if (m && m.kind === 'evolution') {
      box(doc, x, y, Q, Q, 1.2, { fill: fill, border: INK, bw: 0.7 });
    } else {
      box(doc, x, y, Q, Q, 1.2, { fill: fill, border: INK, bw: 0.4 });
    }
    if (m) {
      drawIcon(doc, 'track', m.kind, x + 1.5, y + 1.5, 7);
    }
    if (evoItem) {
      // item (stone/trade) in the bottom right corner: 4 mm disc
      const ix = x + 7, iy = y + 7;
      circle(doc, ix + 2, iy + 2, 2, { fill: PAPER, border: INK, bw: 0.3 });
      drawIcon(doc, 'general', 'item', ix + 0.7, iy + 0.7, 2.6);
    }
  }
  doc.restore();
}

// ---------------------------------------------------------------- A4 sheet: geometry and marks

function sheetGeometry(opts) {
  const band = opts.cuts || opts.registration ? MARK_BAND : 0;
  const inset = opts.margin + band;
  const s = Math.min((A4.w - 2 * inset) / A4.w, (A4.h - 2 * inset) / A4.h);
  return {
    s: s,
    ox: (A4.w - A4.w * s) / 2,
    oy: (A4.h - A4.h * s) / 2,
    cw: CARD.w * s,
    ch: CARD.h * s
  };
}

// Registration marks: crosses in the margin. Fixed positions, symmetric about the center of the A4,
// so front and back have the same marks and the mirror (flipping on the long edge) overlaps them.
function registrationPositions(opts) {
  const d = opts.margin + 1.6;
  return [
    { x: d, y: A4.h * 0.25 }, { x: d, y: A4.h * 0.75 },
    { x: A4.w - d, y: A4.h * 0.25 }, { x: A4.w - d, y: A4.h * 0.75 },
    { x: A4.w * 0.25, y: d }, { x: A4.w * 0.75, y: d },
    { x: A4.w * 0.25, y: A4.h - d }, { x: A4.w * 0.75, y: A4.h - d }
  ];
}

// Cut marks: on the outer edges of the grid, on the cut lines between the cards (0.5 to 3 mm outwards).
function drawCuts(doc, geo) {
  const xs = [0, 1, 2].map(function (k) { return geo.ox + k * geo.cw; });
  const ys = [0, 1, 2].map(function (k) { return geo.oy + k * geo.ch; });
  const right = geo.ox + 2 * geo.cw, bottom = geo.oy + 2 * geo.ch;
  doc.save();
  doc.lineWidth(0.2).strokeColor(INK);
  xs.forEach(function (x) {
    doc.moveTo(x, geo.oy - 0.5).lineTo(x, geo.oy - 3).stroke();
    doc.moveTo(x, bottom + 0.5).lineTo(x, bottom + 3).stroke();
  });
  ys.forEach(function (y) {
    doc.moveTo(geo.ox - 0.5, y).lineTo(geo.ox - 3, y).stroke();
    doc.moveTo(right + 0.5, y).lineTo(right + 3, y).stroke();
  });
  doc.restore();
}

function drawRegistration(doc, opts) {
  const b = 1.25;
  doc.save();
  doc.lineWidth(0.2).strokeColor(INK);
  registrationPositions(opts).forEach(function (p) {
    doc.moveTo(p.x - b, p.y).lineTo(p.x + b, p.y).stroke();
    doc.moveTo(p.x, p.y - b).lineTo(p.x, p.y + b).stroke();
  });
  doc.restore();
}

// One A4 sheet with the group's cards (up to 4), in slot order 0..3 (row by row, from the left).
function drawSheet(doc, group, side, opts, chain) {
  doc.addPage({ size: 'A4', margin: 0 });
  const geo = sheetGeometry(opts);
  doc.save();
  doc.scale(MM); // from here on, 1 unit = 1 mm
  if (opts.cuts) drawCuts(doc, geo);
  if (opts.registration) drawRegistration(doc, opts);
  const cards = side === 'back' && opts.mirror ? PrintSelection.mirrorBack(group) : group;
  for (let k = 0; k < PER_SHEET; k++) {
    const card = cards[k];
    if (!card) continue;
    const c = k % 2, r = Math.floor(k / 2);
    doc.save();
    doc.translate(geo.ox + c * geo.cw, geo.oy + r * geo.ch);
    doc.scale(geo.s);
    if (side === 'front') drawFront(doc, card, opts, chain);
    else drawBack(doc, card);
    doc.restore();
  }
  doc.restore();
}

// ---------------------------------------------------------------- output

function writePdf(file, pages, opts, chain, title) {
  return new Promise(function (resolve, reject) {
    const doc = new PDFDocument({ autoFirstPage: false, size: 'A4', margin: 0, info: { Title: title } });
    const stream = fs.createWriteStream(file);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);
    pages.forEach(function (pg) { drawSheet(doc, pg.group, pg.side, opts, chain); });
    doc.end();
  });
}

function parseOptions(argv) {
  const o = {
    margin: 4, cuts: true, registration: true, mirror: true,
    ids: null, unlocked: 1, font: DEFAULT_FONT, out: OUT_DIR, help: false
  };
  const onOff = function (v, name) {
    if (v === 'on') return true;
    if (v === 'off') return false;
    throw new Error(name + ' accepts on or off, got "' + v + '".');
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = function () {
      if (i + 1 >= argv.length) throw new Error(a + ' needs a value.');
      return argv[++i];
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--margin') {
      o.margin = Number(next());
      if (!(o.margin >= 0 && o.margin < 40)) throw new Error('--margin must be a number from 0 to 40 (mm).');
    } else if (a === '--cuts') o.cuts = onOff(next(), '--cuts');
    else if (a === '--registration') o.registration = onOff(next(), '--registration');
    else if (a === '--mirror') o.mirror = onOff(next(), '--mirror');
    else if (a === '--ids') o.ids = next();
    else if (a === '--unlocked') {
      o.unlocked = Number(next());
      if (!(o.unlocked >= 0 && o.unlocked <= MOVES)) throw new Error('--unlocked must be from 0 to ' + MOVES + '.');
    } else if (a === '--font') o.font = next();
    else if (a === '--out') o.out = path.resolve(next());
    else throw new Error('unknown option: ' + a + ' (use --help).');
  }
  return o;
}

// "1-12", "1,4,25-30" -> Set of numbers
function parseIds(str) {
  const ids = new Set();
  String(str).split(',').map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (t) {
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(t);
    if (m) {
      for (let n = Number(m[1]); n <= Number(m[2]); n++) ids.add(n);
    } else if (/^\d+$/.test(t)) {
      ids.add(Number(t));
    } else {
      throw new Error('invalid --ids: "' + t + '". Use 1-12 or 1,4,25-30.');
    }
  });
  return ids;
}

async function main(argv) {
  const opts = parseOptions(argv);
  if (opts.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace('/*', '').trim());
    return;
  }
  if (!fs.existsSync(opts.font)) throw new Error('font not found: ' + opts.font + ' (use --font).');
  FONT = opts.font;

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(data)) throw new Error(DATA_FILE + ' must be a list.');

  const selection = opts.ids ? parseIds(opts.ids) : new Set(data.map(function (p) { return Number(p.id); }));
  const species = PrintSelection.filter(data, selection);
  if (!species.length) throw new Error('no species selected.');
  checkData(species).forEach(function (a) { console.warn('WARNING: ' + a); });

  const chain = computeChain(data);
  const groups = PrintSelection.group(species, PER_SHEET);
  const front = groups.map(function (group) { return { group: group, side: 'front' }; });
  const back = groups.map(function (group) { return { group: group, side: 'back' }; });
  const interleaved = [];
  groups.forEach(function (group) {
    interleaved.push({ group: group, side: 'front' }, { group: group, side: 'back' });
  });

  fs.mkdirSync(opts.out, { recursive: true });
  const outputs = [
    ['cards-front.pdf', front, 'Cards: front'],
    ['cards-back.pdf', back, 'Cards: back (track)'],
    ['cards-A4.pdf', interleaved, 'Cards: front and back interleaved']
  ];
  for (const [name, pages, title] of outputs) {
    const file = path.join(opts.out, name);
    await writePdf(file, pages, opts, chain, title);
    console.log(name + ': ' + pages.length + ' sheet(s), ' + Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
  const geo = sheetGeometry(opts);
  console.log('Cards: ' + species.length + ' (' + groups.length + ' front and back sheet(s)). ' +
    'Grid scale: ' + geo.s.toFixed(4) + ' (card ' + (CARD.w * geo.s).toFixed(2) + ' x ' +
    (CARD.h * geo.s).toFixed(2) + ' mm). Margin ' + opts.margin + ' mm.');
}

module.exports = { sheetGeometry, registrationPositions, parseOptions, TRACK, MM, A4, CARD };

if (require.main === module) {
  main(process.argv.slice(2)).catch(function (e) {
    console.error('ERROR: ' + e.message);
    process.exit(1);
  });
}
