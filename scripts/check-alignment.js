#!/usr/bin/env node
/* Checks the alignment between front and back of the PDFs built by build-pdf.js.

   Rasterizes the first sheet of cards-front.pdf and cards-back.pdf (in scenarios/<id>/print/) with
   pdftoppm (grayscale, 600 dpi), measures the center of each registration mark (cross) by the
   centroid of the dark pixels and compares:
     - front mark at (x, y)  x  back mark at (210 - x, y), which is the physical position after
       flipping the sheet on the long edge (horizontal mirror).
   The difference must be below the tolerance (default 0.2 mm).

   Usage: node scripts/check-alignment.js [--margin 4] [--dpi 600] [--tolerance 0.2]
                                          [--front <pdf>] [--back <pdf>]   (default: scenarios/<id>/print/)
   Use --margin with the same value as the builder (both default to 4).
   Exits with code 1 if any difference exceeds the tolerance.

   What this proves: that the file draws front and back at the same physical place, with no scale or
   offset in rasterization. It does not prove the printer's paper feed: for that, print
   and check the marks with a ruler or a magnifier.
*/
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { registrationPositions, A4 } = require('./build-pdf.js');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(require(path.join(ROOT, 'lib', 'scenario')).dir(), 'print');
const WINDOW_RADIUS = 1.5; // mm around each cross (the cross has 1.25 mm arms)

function options(argv) {
  const o = { margin: 4, dpi: 600, tolerance: 0.2, front: path.join(DIR, 'cards-front.pdf'), back: path.join(DIR, 'cards-back.pdf') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new Error(a + ' needs a value.'); return argv[++i]; };
    if (a === '--margin') o.margin = Number(next());
    else if (a === '--dpi') o.dpi = Number(next());
    else if (a === '--tolerance') o.tolerance = Number(next());
    else if (a === '--front') o.front = path.resolve(next());
    else if (a === '--back') o.back = path.resolve(next());
    else throw new Error('unknown option: ' + a);
  }
  return o;
}

function pageCount(file) {
  const out = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  const m = /^Pages:\s+(\d+)/m.exec(out);
  if (!m) throw new Error('pdfinfo could not read the page count of ' + file);
  return Number(m[1]);
}

// Rasterizes page 1 in grayscale and returns { w, h, data } (PGM P5, 8 bits).
function rasterizePage1(file, dpi) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-alignment-'));
  try {
    execFileSync('pdftoppm', ['-gray', '-r', String(dpi), '-f', '1', '-l', '1', file, path.join(tmp, 'p')]);
    const img = fs.readdirSync(tmp).find(n => n.endsWith('.pgm'));
    if (!img) throw new Error('pdftoppm did not produce an image for ' + file);
    return readPgm(fs.readFileSync(path.join(tmp, img)));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function readPgm(buf) {
  let pos = 0;
  const token = () => {
    while (pos < buf.length) {
      const c = buf[pos];
      if (c === 0x23) { while (pos < buf.length && buf[pos] !== 0x0a) pos++; continue; } // comment
      if (c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09) { pos++; continue; }
      break;
    }
    const start = pos;
    while (pos < buf.length && !(buf[pos] === 0x20 || buf[pos] === 0x0a || buf[pos] === 0x0d || buf[pos] === 0x09)) pos++;
    return buf.slice(start, pos).toString('ascii');
  };
  if (token() !== 'P5') throw new Error('unexpected PGM format (expected P5).');
  const w = Number(token()), h = Number(token()), maxv = Number(token());
  if (maxv !== 255) throw new Error('PGM with unexpected depth: ' + maxv);
  pos++; // one whitespace byte before the data
  return { w, h, data: buf.subarray(pos, pos + w * h) };
}

// Darkness-weighted centroid, in mm, inside a window around (xMm, yMm).
function centroid(img, dpi, xMm, yMm) {
  const mmPerPx = 25.4 / dpi;
  const x0 = Math.max(0, Math.floor((xMm - WINDOW_RADIUS) / mmPerPx));
  const x1 = Math.min(img.w - 1, Math.ceil((xMm + WINDOW_RADIUS) / mmPerPx));
  const y0 = Math.max(0, Math.floor((yMm - WINDOW_RADIUS) / mmPerPx));
  const y1 = Math.min(img.h - 1, Math.ceil((yMm + WINDOW_RADIUS) / mmPerPx));
  let sum = 0, sx = 0, sy = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = img.data[y * img.w + x];
      if (v >= 200) continue;
      const d = 255 - v;
      sum += d;
      sx += d * (x + 0.5);
      sy += d * (y + 0.5);
    }
  }
  if (sum === 0) throw new Error('registration mark not found near (' + xMm.toFixed(2) + ', ' + yMm.toFixed(2) + ') mm');
  return { x: (sx / sum) * mmPerPx, y: (sy / sum) * mmPerPx };
}

function main(argv) {
  const o = options(argv);
  for (const file of [o.front, o.back]) {
    if (!fs.existsSync(file)) throw new Error('could not find ' + file + '. Run first: npm run build');
  }
  const pf = pageCount(o.front), pb = pageCount(o.back);
  if (pf !== pb) throw new Error('different number of sheets: front ' + pf + ', back ' + pb);

  const expected = registrationPositions({ margin: o.margin });
  const front = rasterizePage1(o.front, o.dpi);
  const back = rasterizePage1(o.back, o.dpi);

  const rows = [];
  let largest = 0;
  expected.forEach(function (e) {
    const f = centroid(front, o.dpi, e.x, e.y);
    // on the back, the physical mark at e is at (210 - e.x, e.y) on the sheet, because the back is mirrored
    const b = centroid(back, o.dpi, A4.w - e.x, e.y);
    const bPhysical = { x: A4.w - b.x, y: b.y };
    const dx = bPhysical.x - f.x, dy = bPhysical.y - f.y;
    const dist = Math.hypot(dx, dy);
    const designOffset = Math.max(Math.hypot(f.x - e.x, f.y - e.y), Math.hypot(b.x - (A4.w - e.x), b.y - e.y));
    // Sanity: the cross has to be near the designed place. Far from it, the window caught something else.
    if (designOffset > 0.5) {
      throw new Error('registration mark at ' + e.x.toFixed(2) + ', ' + e.y.toFixed(2) + ' mm was not found (offset ' +
        designOffset.toFixed(2) + ' mm). Check that the PDF was built with --registration on and with the same --margin.');
    }
    largest = Math.max(largest, dist);
    rows.push({
      mark: '(' + e.x.toFixed(2) + ', ' + e.y.toFixed(2) + ')',
      front: f,
      backPhysical: bPhysical,
      dx: dx, dy: dy, dist: dist,
      designOffset: designOffset
    });
  });

  console.log('Registration marks measured in mm (rasterized at ' + o.dpi + ' dpi, page 1).');
  console.log('expected mark   | front (x, y)      | back after mirror (x, y)  | diff (dx, dy)      | distance  | design offset');
  rows.forEach(function (l) {
    console.log(
      l.mark.padEnd(15) + ' | ' +
      ('(' + l.front.x.toFixed(3) + ', ' + l.front.y.toFixed(3) + ')').padEnd(17) + ' | ' +
      ('(' + l.backPhysical.x.toFixed(3) + ', ' + l.backPhysical.y.toFixed(3) + ')').padEnd(25) + ' | ' +
      ('(' + l.dx.toFixed(3) + ', ' + l.dy.toFixed(3) + ')').padEnd(18) + ' | ' +
      l.dist.toFixed(3).padEnd(9) + ' | ' + l.designOffset.toFixed(3)
    );
  });
  const ok = largest < o.tolerance;
  console.log('');
  console.log('Largest front x back difference: ' + largest.toFixed(3) + ' mm (tolerance ' + o.tolerance + ' mm). ' +
    (ok ? 'OK.' : 'FAILED.'));
  return ok ? 0 : 1;
}

module.exports = { readPgm, centroid };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error('ERROR: ' + e.message);
    process.exitCode = 1;
  }
}
