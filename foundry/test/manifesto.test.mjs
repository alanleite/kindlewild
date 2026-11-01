import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const m = JSON.parse(readFileSync(new URL('../system.json', import.meta.url)));

test('manifesto: id, compatibilidade e tipos', () => {
  assert.equal(m.id, 'kindlewild');
  assert.equal(m.title, 'Kindlewild');
  assert.deepEqual(m.compatibility, { minimum: '14.364', verified: '14.365', maximum: '14' });
  assert.ok(m.documentTypes.Actor.criatura);
  assert.ok(m.documentTypes.Item.golpe);
  assert.deepEqual(m.esmodules, ['kindlewild.mjs']);
  assert.equal(m.packs, undefined, 'o compêndio fica no módulo do cenário, não no sistema');
  assert.equal(m.languages[0].lang, 'pt-BR');
});
