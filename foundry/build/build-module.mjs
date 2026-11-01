// Builds a scenario's Foundry module: module.json, creature compendium and images.
// Output in scenarios/<id>/foundry/ (everything there is generated and gitignored).
// Usage: cd foundry && npm run build [-- --scenario <id>]   (default: scenarios/default.txt or KINDLEWILD_SCENARIO)
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import scenario from '../../lib/scenario.js';
import { creatureToActor, imageFile, SYSTEM } from './converter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildSources(data, module) {
  return data.map((c) => creatureToActor(c, data, { module }));
}

export function moduleManifest(m) {
  const system = JSON.parse(readFileSync(path.join(ROOT, 'system.json'), 'utf8'));
  return {
    id: m.foundry.module,
    title: m.foundry.title,
    description: m.description,
    version: system.version,
    compatibility: system.compatibility,
    authors: system.authors,
    relationships: { systems: [{ id: SYSTEM, type: 'system', compatibility: { minimum: system.version } }] },
    packs: [{
      name: m.foundry.pack, label: m.foundry.label, system: SYSTEM,
      path: `packs/${m.foundry.pack}`, type: 'Actor', ownership: { PLAYER: 'OBSERVER', ASSISTANT: 'OWNER' }
    }]
  };
}

function readScenario(argv) {
  const i = argv.indexOf('--scenario');
  return i >= 0 ? argv[i + 1] : scenario.defaultId();
}

async function main() {
  const id = readScenario(process.argv);
  const m = scenario.manifest(id);
  const data = scenario.creatures(id);
  const out = path.join(scenario.dir(id), 'foundry');
  const sources = buildSources(data, m.foundry.module);

  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'module.json'), JSON.stringify(moduleManifest(m), null, 2) + '\n');

  const src = path.join(out, 'src/packs', m.foundry.pack);
  rmSync(path.join(out, 'src'), { recursive: true, force: true });
  mkdirSync(src, { recursive: true });
  for (const a of sources) {
    const name = `${String(a.system.speciesId).padStart(3, '0')}-${a.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.json`;
    writeFileSync(path.join(src, name), JSON.stringify(a, null, 2));
  }

  const assets = path.join(out, 'assets');
  rmSync(assets, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });
  for (const c of data) {
    if (!c.image) continue;
    const from = scenario.imagePath(c, id);
    if (!existsSync(from)) throw new Error(`missing image: ${from}`);
    copyFileSync(from, path.join(assets, imageFile(c)));
  }

  const { compilePack } = await import('@foundryvtt/foundryvtt-cli');
  const dest = path.join(out, 'packs', m.foundry.pack);
  rmSync(path.join(out, 'packs'), { recursive: true, force: true });
  await compilePack(src, dest, { log: false });
  console.log(`Module ${m.foundry.module} built: ${sources.length} creatures in ${out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
