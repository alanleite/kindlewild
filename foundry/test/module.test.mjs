import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import scenario from '../../lib/scenario.js';
import { buildSources, moduleManifest } from '../build/build-module.mjs';
import { DEFAULT_IMAGE } from '../build/converter.mjs';

const m = scenario.manifest();
const data = scenario.creatures();
const build = () => buildSources(data, m.foundry.module);

test('one actor per creature, 4 moves each, unique ids', () => {
  const sources = build();
  assert.equal(sources.length, data.length);
  assert.equal(sources.reduce((s, a) => s + a.items.length, 0), 4 * data.length);
  assert.equal(new Set(sources.map((a) => a._id)).size, data.length);
  for (const a of sources) assert.match(a._id, /^[a-zA-Z0-9]{16}$/);
});

test('every form has slots in every attribute', () => {
  for (const a of build()) {
    for (const v of Object.values(a.system.attributes)) assert.ok(v.slots >= 1, a.name);
  }
});

test('every species has a size', () => {
  for (const c of data) assert.ok(['small', 'medium', 'large'].includes(c.size), c.name);
});

test('images point to the scenario module and exist (no image: default icon)', () => {
  const sources = build();
  data.forEach((c, i) => {
    if (!c.image) return assert.equal(sources[i].img, DEFAULT_IMAGE, c.name);
    assert.ok(sources[i].img.startsWith(`modules/${m.foundry.module}/assets/`), sources[i].img);
    assert.ok(existsSync(scenario.imagePath(c)), c.name);
  });
});

test('module manifest depends on the system and declares the compendium', () => {
  const mod = moduleManifest(m);
  assert.equal(mod.id, m.foundry.module);
  assert.equal(mod.relationships.systems[0].id, 'kindlewild');
  assert.equal(mod.packs[0].system, 'kindlewild');
  assert.equal(mod.packs[0].path, `packs/${m.foundry.pack}`);
  assert.equal(mod.packs[0].type, 'Actor');
});
