#!/usr/bin/env node
/* Trava de publicação: impede que conteúdo de terceiros entre no repositório público.

   Confere os arquivos que iriam para o git (rastreados + novos não ignorados) ou, com --staged, só os do
   commit em preparo:
     1. Cenários: cenarios/<id>/ só pode ser versionado se cenario.json tiver "privado": false.
     2. Binários: imagens só dentro de cenarios/<id>/imagens/ de cenário público; PDF e LevelDB nunca.
     3. Termos bloqueados: cada palavra (e cada par de palavras) do texto, em minúsculas e sem acento,
        é comparada com os hashes SHA-256 de scripts/termos-bloqueados.sha256. Os termos em si não ficam
        no repositório: a lista legível é mantida fora dele e convertida com --gerar-hashes.

   Uso: node scripts/checar-publicacao.js [--staged]
        node scripts/checar-publicacao.js --gerar-hashes <lista.txt>   (uma palavra ou par por linha; # comenta)
   Sai com código 1 se encontrar problema. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const ARQ_HASHES = path.join(__dirname, 'termos-bloqueados.sha256');
const IMAGEM = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif|psd)$/i;
const PROIBIDO = /\.(pdf|ldb|log)$|(^|\/)(CURRENT|LOCK|MANIFEST-\d+)$/;
const BINARIO = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif|psd|pdf|ldb|ttf|otf|woff2?|zip|ico)$/i;

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function gerarHashes(lista) {
  const termos = fs.readFileSync(lista, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const hashes = [...new Set(termos.map((t) => hash(normalizar(t))))].sort();
  fs.writeFileSync(ARQ_HASHES, '# SHA-256 de termos bloqueados (ver scripts/checar-publicacao.js)\n' + hashes.join('\n') + '\n');
  console.log(`${hashes.length} hashes gravados em ${path.relative(RAIZ, ARQ_HASHES)}`);
}

function listarArquivos(staged) {
  const git = (args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean);
  if (staged) return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);
  return git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).filter((f) => fs.existsSync(path.join(RAIZ, f)));
}

function cenarioPublico(id, cache) {
  if (!(id in cache)) {
    const arq = path.join(RAIZ, 'cenarios', id, 'cenario.json');
    try { cache[id] = JSON.parse(fs.readFileSync(arq, 'utf8')).privado === false; } catch (_) { cache[id] = false; }
  }
  return cache[id];
}

function principal(argv) {
  const i = argv.indexOf('--gerar-hashes');
  if (i >= 0) return gerarHashes(argv[i + 1]);

  const bloqueados = new Set(fs.readFileSync(ARQ_HASHES, 'utf8').split('\n').filter((l) => /^[0-9a-f]{64}$/.test(l)));
  const problemas = [];
  const publicos = {};

  for (const arq of listarArquivos(argv.includes('--staged'))) {
    const partes = arq.split('/');
    if (partes[0] === 'cenarios' && partes.length > 2 && !cenarioPublico(partes[1], publicos)) {
      problemas.push(`${arq}: cenário "${partes[1]}" não é público (cenario.json precisa de "privado": false)`);
      continue;
    }
    if (PROIBIDO.test(arq)) { problemas.push(`${arq}: tipo de arquivo que nunca vai para o repositório`); continue; }
    if (IMAGEM.test(arq) && !(partes[0] === 'cenarios' && partes[2] === 'imagens')) {
      problemas.push(`${arq}: imagem fora de cenarios/<id>/imagens/`);
      continue;
    }
    if (BINARIO.test(arq)) continue;

    const linhas = fs.readFileSync(path.join(RAIZ, arq), 'utf8').split('\n');
    linhas.forEach((linha, n) => {
      const palavras = normalizar(linha).split(' ').filter(Boolean);
      palavras.forEach((p, k) => {
        const candidatos = [p];
        if (k + 1 < palavras.length) candidatos.push(p + ' ' + palavras[k + 1]);
        for (const c of candidatos) {
          if (bloqueados.has(hash(c))) problemas.push(`${arq}:${n + 1}: termo bloqueado "${c}"`);
        }
      });
    });
  }

  if (problemas.length) {
    console.error('Publicação bloqueada:\n  ' + problemas.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log('Publicação ok: nenhum conteúdo bloqueado.');
  }
}

principal(process.argv.slice(2));
