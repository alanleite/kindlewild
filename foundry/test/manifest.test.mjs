import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const m = JSON.parse(readFileSync(new URL('../system.json', import.meta.url)));

test('manifest: id, compatibility and types', () => {
  assert.equal(m.id, 'kindlewild');
  assert.equal(m.title, 'Kindlewild');
  assert.deepEqual(m.compatibility, { minimum: '14.364', verified: '14.365', maximum: '14' });
  assert.ok(m.documentTypes.Actor.creature);
  assert.ok(m.documentTypes.Item.move);
  assert.deepEqual(m.esmodules, ['kindlewild.mjs']);
  assert.equal(m.packs, undefined, 'the compendium lives in the scenario module, not in the system');
  assert.equal(m.languages[0].lang, 'en');
  assert.ok(m.languages.some((l) => l.lang === 'pt-BR'));
});

test('languages have the same keys', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort();
  const [en, pt] = ['en', 'pt-BR'].map((l) => JSON.parse(readFileSync(new URL(`../lang/${l}.json`, import.meta.url))));
  assert.deepEqual(keys(pt), keys(en));
});
