// Copies the system and the scenario module into the Foundry data folder.
// Usage: cd foundry && npm run build && npm run deploy [-- --packs] [-- --scenario <id>]
// Target: $FOUNDRY_DATA (Foundry's "Data" folder), default ~/services/foundry/data/Data.
// Without --packs, the server's compendium (LevelDB) is left untouched: replacing it while a world is open
// corrupts the pack. Use --packs only with the world closed (or the server stopped).
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import scenario from '../../lib/scenario.js';
import { SYSTEM } from './converter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.FOUNDRY_DATA || path.join(os.homedir(), 'services/foundry/data/Data');
const i = process.argv.indexOf('--scenario');
const scenarioId = i >= 0 ? process.argv[i + 1] : scenario.defaultId();

function copy(from, to, entries) {
  for (const entry of entries) {
    const target = path.join(to, entry);
    rmSync(target, { recursive: true, force: true });
    cpSync(path.join(from, entry), target, { recursive: true });
  }
}

for (const sub of ['systems', 'modules']) {
  if (!existsSync(path.join(DATA, sub))) throw new Error(`Folder not found: ${path.join(DATA, sub)} (set FOUNDRY_DATA)`);
}

copy(ROOT, path.join(DATA, 'systems', SYSTEM), ['system.json', 'kindlewild.mjs', 'module', 'templates', 'styles', 'lang']);

const m = scenario.manifest(scenarioId);
const moduleSource = path.join(scenario.dir(scenarioId), 'foundry');
if (!existsSync(path.join(moduleSource, 'packs'))) throw new Error(`Module not built: run "npm run build -- --scenario ${scenarioId}" first.`);
const moduleTarget = path.join(DATA, 'modules', m.foundry.module);
const withPacks = process.argv.includes('--packs') || !existsSync(path.join(moduleTarget, 'packs'));
copy(moduleSource, moduleTarget, ['module.json', 'assets', ...(withPacks ? ['packs'] : [])]);

console.log(`System in ${path.join(DATA, 'systems', SYSTEM)}; module in ${moduleTarget}` +
  (withPacks ? ' (with compendium)' : ' (compendium kept; use --packs with the world closed)'));
