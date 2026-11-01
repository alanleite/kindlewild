// Finds and loads a scenario (scenarios/<id>/). The core does not know any scenario by name:
// the default comes from KINDLEWILD_SCENARIO or from scenarios/default.txt.
// Scenario file convention: scenario.json (manifest), creatures.json (list) and images/.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCENARIOS_DIR = path.join(ROOT, 'scenarios');

function defaultId() {
  if (process.env.KINDLEWILD_SCENARIO) return process.env.KINDLEWILD_SCENARIO;
  const file = path.join(SCENARIOS_DIR, 'default.txt');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  throw new Error('No scenario selected: set KINDLEWILD_SCENARIO or create scenarios/default.txt.');
}

function dir(id = defaultId()) {
  const d = path.join(SCENARIOS_DIR, id);
  if (!fs.existsSync(path.join(d, 'scenario.json'))) throw new Error(`Scenario not found: ${d}/scenario.json`);
  return d;
}

function manifest(id = defaultId()) {
  return JSON.parse(fs.readFileSync(path.join(dir(id), 'scenario.json'), 'utf8'));
}

function creatures(id = defaultId()) {
  return JSON.parse(fs.readFileSync(path.join(dir(id), 'creatures.json'), 'utf8'));
}

// Absolute path of a creature's image (the `image` field is relative to the scenario folder).
function imagePath(creature, id = defaultId()) {
  if (!creature.image) return null;
  return path.join(dir(id), creature.image);
}

module.exports = { ROOT, SCENARIOS_DIR, defaultId, dir, manifest, creatures, imagePath };
