#!/usr/bin/env node
/* Publication guard: keeps third-party content out of the public repository.

   Checks the files that would go to git (tracked + new non-ignored) or, with --staged, only those in the
   commit being prepared:
     1. Scenarios: scenarios/<id>/ can only be versioned if scenario.json has "private": false.
     2. Binaries: images only inside scenarios/<id>/images/ of a public scenario; PDF and LevelDB never.
     3. Blocked terms: each word (and each pair of words) of the text, lowercased and without accents,
        is compared with the SHA-256 hashes in scripts/blocked-terms.sha256. The terms themselves are not in
        the repository: the readable list is kept outside it and converted with --hash-terms.

   Usage: node scripts/check-publication.js [--staged]
          node scripts/check-publication.js --hash-terms <list.txt>   (one word or pair per line; # comments)
   Exits with code 1 if it finds a problem. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HASHES_FILE = path.join(__dirname, 'blocked-terms.sha256');
const IMAGE = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif|psd)$/i;
const FORBIDDEN = /\.(pdf|ldb|log)$|(^|\/)(CURRENT|LOCK|MANIFEST-\d+)$/;
const BINARY = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif|psd|pdf|ldb|ttf|otf|woff2?|zip|ico)$/i;

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hashTerms(list) {
  const terms = fs.readFileSync(list, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const hashes = [...new Set(terms.map((t) => hash(normalize(t))))].sort();
  fs.writeFileSync(HASHES_FILE, '# SHA-256 of blocked terms (see scripts/check-publication.js)\n' + hashes.join('\n') + '\n');
  console.log(`${hashes.length} hashes written to ${path.relative(ROOT, HASHES_FILE)}`);
}

function listFiles(staged) {
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  if (staged) return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);
  return git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).filter((f) => fs.existsSync(path.join(ROOT, f)));
}

function publicScenario(id, cache) {
  if (!(id in cache)) {
    const file = path.join(ROOT, 'scenarios', id, 'scenario.json');
    try { cache[id] = JSON.parse(fs.readFileSync(file, 'utf8')).private === false; } catch (_) { cache[id] = false; }
  }
  return cache[id];
}

function main(argv) {
  const i = argv.indexOf('--hash-terms');
  if (i >= 0) return hashTerms(argv[i + 1]);

  const blocked = new Set(fs.readFileSync(HASHES_FILE, 'utf8').split('\n').filter((l) => /^[0-9a-f]{64}$/.test(l)));
  const problems = [];
  const publicCache = {};

  for (const file of listFiles(argv.includes('--staged'))) {
    const parts = file.split('/');
    if (parts[0] === 'scenarios' && parts.length > 2 && !publicScenario(parts[1], publicCache)) {
      problems.push(`${file}: scenario "${parts[1]}" is not public (scenario.json needs "private": false)`);
      continue;
    }
    if (FORBIDDEN.test(file)) { problems.push(`${file}: file type that never goes to the repository`); continue; }
    if (IMAGE.test(file) && !(parts[0] === 'scenarios' && parts[2] === 'images')) {
      problems.push(`${file}: image outside scenarios/<id>/images/`);
      continue;
    }
    if (BINARY.test(file)) continue;

    const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
    lines.forEach((line, n) => {
      const words = normalize(line).split(' ').filter(Boolean);
      words.forEach((w, k) => {
        const candidates = [w];
        if (k + 1 < words.length) candidates.push(w + ' ' + words[k + 1]);
        for (const c of candidates) {
          if (blocked.has(hash(c))) problems.push(`${file}:${n + 1}: blocked term "${c}"`);
        }
      });
    });
  }

  if (problems.length) {
    console.error('Publication blocked:\n  ' + problems.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log('Publication ok: no blocked content.');
  }
}

main(process.argv.slice(2));
