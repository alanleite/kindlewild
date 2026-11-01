const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadIcons() {
  const context = { window: {} };
  vm.createContext(context);
  const file = path.join(__dirname, '..', 'icons.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context.window.ICONS;
}

test('Strength uses a recognizable general hand drawing', () => {
  const icons = loadIcons();
  const hand = icons.get('general', 'hand');
  assert.notEqual(hand, icons.placeholder);
  assert.doesNotMatch(hand, /fill="currentColor"|stroke="none"/);
  assert.equal(
    icons.get('attribute', 'strength'),
    hand
  );
  assert.equal(
    icons.get('track', 'strength'),
    hand
  );
});

test('Agility uses the general shoe drawing', () => {
  const icons = loadIcons();
  const shoe = icons.get('general', 'shoe');
  assert.notEqual(shoe, icons.placeholder);
  assert.doesNotMatch(shoe, /fill="currentColor"|stroke="none"/);
  assert.doesNotMatch(shoe, /stroke-width="2\.4"/);
  assert.equal(
    icons.get('attribute', 'agility'),
    shoe
  );
});
