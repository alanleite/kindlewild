// Copia o sistema e o módulo do cenário para a pasta de dados do Foundry.
// Uso: cd foundry && npm run gerar && npm run deploy [-- --packs] [-- --cenario <id>]
// Destino: $FOUNDRY_DATA (pasta "Data" do Foundry), padrão ~/services/foundry/data/Data.
// Sem --packs, o compêndio (LevelDB) do servidor não é tocado: substituí-lo com um mundo aberto
// corrompe o pack. Use --packs só com o mundo fechado (ou o servidor parado).
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import cenario from '../../lib/cenario.js';
import { SISTEMA } from './converter.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DADOS = process.env.FOUNDRY_DATA || path.join(os.homedir(), 'services/foundry/data/Data');
const i = process.argv.indexOf('--cenario');
const idCenario = i >= 0 ? process.argv[i + 1] : cenario.idPadrao();

function copiar(origem, destino, itens) {
  for (const item of itens) {
    const alvo = path.join(destino, item);
    rmSync(alvo, { recursive: true, force: true });
    cpSync(path.join(origem, item), alvo, { recursive: true });
  }
}

for (const sub of ['systems', 'modules']) {
  if (!existsSync(path.join(DADOS, sub))) throw new Error(`Pasta não encontrada: ${path.join(DADOS, sub)} (defina FOUNDRY_DATA)`);
}

copiar(RAIZ, path.join(DADOS, 'systems', SISTEMA), ['system.json', 'kindlewild.mjs', 'module', 'templates', 'styles', 'lang']);

const m = cenario.manifesto(idCenario);
const origemModulo = path.join(cenario.pasta(idCenario), 'foundry');
if (!existsSync(path.join(origemModulo, 'packs'))) throw new Error(`Módulo não gerado: rode "npm run gerar -- --cenario ${idCenario}" antes.`);
const destinoModulo = path.join(DADOS, 'modules', m.foundry.modulo);
const comPacks = process.argv.includes('--packs') || !existsSync(path.join(destinoModulo, 'packs'));
copiar(origemModulo, destinoModulo, ['module.json', 'assets', ...(comPacks ? ['packs'] : [])]);

console.log(`Sistema em ${path.join(DADOS, 'systems', SISTEMA)}; módulo em ${destinoModulo}` +
  (comPacks ? ' (com compêndio)' : ' (compêndio mantido; use --packs com o mundo fechado)'));
