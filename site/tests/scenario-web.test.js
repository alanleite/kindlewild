'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('external database images resolve relative to the JSON URL, not its query', async () => {
  const window = {};
  const location = { href: 'https://site.example/site/?data=' + encodeURIComponent('https://storage.example/cards/creatures.json?version=2') };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scenario-web.js'), 'utf8'), { window, location, URL });
  const source = await window.ScenarioWeb.dataSource();
  assert.equal(source.imagePrefix, 'https://storage.example/cards/');
  assert.equal(source.url, 'https://storage.example/cards/creatures.json?version=2');
});
