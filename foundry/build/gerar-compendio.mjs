// Gera o módulo do Foundry de um cenário: module.json, compêndio de criaturas e imagens.
// Saída em cenarios/<id>/foundry/ (module.json versionado; src/, packs/ e assets/ são gerados).
// Uso: cd foundry && npm run gerar [-- --cenario <id>]   (padrão: cenarios/padrao.txt ou KINDLEWILD_CENARIO)
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cenario from '../../lib/cenario.js';
import { especieParaAtor, arquivoImagem, SISTEMA } from './converter.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function gerarFontes(dados, modulo) {
  return dados.map((e) => especieParaAtor(e, dados, { modulo }));
}

export function manifestoModulo(m) {
  const sistema = JSON.parse(readFileSync(path.join(RAIZ, 'system.json'), 'utf8'));
  return {
    id: m.foundry.modulo,
    title: m.foundry.titulo,
    description: m.descricao,
    version: sistema.version,
    compatibility: sistema.compatibility,
    authors: sistema.authors,
    relationships: { systems: [{ id: SISTEMA, type: 'system', compatibility: { minimum: sistema.version } }] },
    packs: [{
      name: m.foundry.pack, label: m.foundry.rotulo, system: SISTEMA,
      path: `packs/${m.foundry.pack}`, type: 'Actor', ownership: { PLAYER: 'OBSERVER', ASSISTANT: 'OWNER' }
    }]
  };
}

function lerCenario(argv) {
  const i = argv.indexOf('--cenario');
  return i >= 0 ? argv[i + 1] : cenario.idPadrao();
}

async function main() {
  const id = lerCenario(process.argv);
  const m = cenario.manifesto(id);
  const dados = cenario.criaturas(id);
  const saida = path.join(cenario.pasta(id), 'foundry');
  const fontes = gerarFontes(dados, m.foundry.modulo);

  mkdirSync(saida, { recursive: true });
  writeFileSync(path.join(saida, 'module.json'), JSON.stringify(manifestoModulo(m), null, 2) + '\n');

  const src = path.join(saida, 'src/packs', m.foundry.pack);
  rmSync(path.join(saida, 'src'), { recursive: true, force: true });
  mkdirSync(src, { recursive: true });
  for (const a of fontes) {
    const nome = `${String(a.system.especieId).padStart(3, '0')}-${a.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.json`;
    writeFileSync(path.join(src, nome), JSON.stringify(a, null, 2));
  }

  const assets = path.join(saida, 'assets');
  rmSync(assets, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });
  for (const e of dados) {
    if (!e.imagem) continue;
    const origem = cenario.caminhoImagem(e, id);
    if (!existsSync(origem)) throw new Error(`imagem faltando: ${origem}`);
    copyFileSync(origem, path.join(assets, arquivoImagem(e)));
  }

  const { compilePack } = await import('@foundryvtt/foundryvtt-cli');
  const destino = path.join(saida, 'packs', m.foundry.pack);
  rmSync(path.join(saida, 'packs'), { recursive: true, force: true });
  await compilePack(src, destino, { log: false });
  console.log(`Módulo ${m.foundry.modulo} gerado: ${fontes.length} criaturas em ${saida}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
