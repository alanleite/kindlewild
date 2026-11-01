#!/usr/bin/env node
/* Valida o alinhamento entre frente e verso dos PDFs gerados por gerar-pdf-preciso.js.

   Rasteriza a primeira folha de cartas-frente.pdf e de cartas-verso.pdf (em cenarios/<id>/impressao/) com
   pdftoppm (em tons de cinza, 600 dpi), mede o centro de cada marca de registro (cruz) pelo
   centroide dos pixels escuros e compara:
     - marca da frente em (x, y)  x  marca do verso em (210 - x, y), que é a posição física depois de
       virar a folha pelo lado longo (espelho na horizontal).
   A diferença tem que ser menor que a tolerância (padrão 0,2 mm).

   Uso: node scripts/validar-alinhamento.js [--margem 4] [--dpi 600] [--tolerancia 0.2]
                                            [--frente <pdf>] [--verso <pdf>]   (padrão: cenarios/<id>/impressao/)
   Use --margem com o mesmo valor do gerador (o padrão dos dois é 4).
   Sai com código 1 se alguma diferença passar da tolerância.

   O que isso prova: que o arquivo desenha frente e verso no mesmo lugar físico, sem escala nem
   deslocamento na rasterização. Não prova a alimentação do papel na impressora: para isso, imprima
   e confira as marcas com régua ou lupa.
*/
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { posicoesRegistro, A4 } = require('./gerar-pdf-preciso.js');

const RAIZ = path.resolve(__dirname, '..');
const PASTA = path.join(require(path.join(RAIZ, 'lib', 'cenario')).pasta(), 'impressao');
const RAIO_JANELA = 1.5; // mm em volta de cada cruz (cruz tem braços de 1,25 mm)

function opcoes(argv) {
  const o = { margem: 4, dpi: 600, tolerancia: 0.2, frente: path.join(PASTA, 'cartas-frente.pdf'), verso: path.join(PASTA, 'cartas-verso.pdf') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const prox = () => { if (i + 1 >= argv.length) throw new Error(a + ' precisa de um valor.'); return argv[++i]; };
    if (a === '--margem') o.margem = Number(prox());
    else if (a === '--dpi') o.dpi = Number(prox());
    else if (a === '--tolerancia') o.tolerancia = Number(prox());
    else if (a === '--frente') o.frente = path.resolve(prox());
    else if (a === '--verso') o.verso = path.resolve(prox());
    else throw new Error('opção desconhecida: ' + a);
  }
  return o;
}

function paginas(arquivo) {
  const saida = execFileSync('pdfinfo', [arquivo], { encoding: 'utf8' });
  const m = /^Pages:\s+(\d+)/m.exec(saida);
  if (!m) throw new Error('pdfinfo não leu o número de páginas de ' + arquivo);
  return Number(m[1]);
}

// Rasteriza a página 1 em tons de cinza e devolve { w, h, dados } (PGM P5, 8 bits).
function rasterizarPagina1(arquivo, dpi) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'validar-alinhamento-'));
  try {
    execFileSync('pdftoppm', ['-gray', '-r', String(dpi), '-f', '1', '-l', '1', arquivo, path.join(tmp, 'p')]);
    const arq = fs.readdirSync(tmp).find(n => n.endsWith('.pgm'));
    if (!arq) throw new Error('pdftoppm não gerou imagem para ' + arquivo);
    return lerPgm(fs.readFileSync(path.join(tmp, arq)));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function lerPgm(buf) {
  let pos = 0;
  const token = () => {
    while (pos < buf.length) {
      const c = buf[pos];
      if (c === 0x23) { while (pos < buf.length && buf[pos] !== 0x0a) pos++; continue; } // comentário
      if (c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09) { pos++; continue; }
      break;
    }
    const ini = pos;
    while (pos < buf.length && !(buf[pos] === 0x20 || buf[pos] === 0x0a || buf[pos] === 0x0d || buf[pos] === 0x09)) pos++;
    return buf.slice(ini, pos).toString('ascii');
  };
  if (token() !== 'P5') throw new Error('formato PGM inesperado (esperado P5).');
  const w = Number(token()), h = Number(token()), maxv = Number(token());
  if (maxv !== 255) throw new Error('PGM com profundidade inesperada: ' + maxv);
  pos++; // um byte de espaço antes dos dados
  return { w, h, dados: buf.subarray(pos, pos + w * h) };
}

// Centroide ponderado pela escuridão, em mm, dentro de uma janela em volta de (xMm, yMm).
function centroide(img, dpi, xMm, yMm) {
  const mmPorPx = 25.4 / dpi;
  const x0 = Math.max(0, Math.floor((xMm - RAIO_JANELA) / mmPorPx));
  const x1 = Math.min(img.w - 1, Math.ceil((xMm + RAIO_JANELA) / mmPorPx));
  const y0 = Math.max(0, Math.floor((yMm - RAIO_JANELA) / mmPorPx));
  const y1 = Math.min(img.h - 1, Math.ceil((yMm + RAIO_JANELA) / mmPorPx));
  let soma = 0, sx = 0, sy = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = img.dados[y * img.w + x];
      if (v >= 200) continue;
      const d = 255 - v;
      soma += d;
      sx += d * (x + 0.5);
      sy += d * (y + 0.5);
    }
  }
  if (soma === 0) throw new Error('marca de registro não encontrada perto de (' + xMm.toFixed(2) + ', ' + yMm.toFixed(2) + ') mm');
  return { x: (sx / soma) * mmPorPx, y: (sy / soma) * mmPorPx };
}

function principal(argv) {
  const o = opcoes(argv);
  for (const arq of [o.frente, o.verso]) {
    if (!fs.existsSync(arq)) throw new Error('não encontrei ' + arq + '. Rode antes: npm run gerar');
  }
  const pf = paginas(o.frente), pv = paginas(o.verso);
  if (pf !== pv) throw new Error('número de folhas diferente: frente ' + pf + ', verso ' + pv);

  const esperadas = posicoesRegistro({ margem: o.margem });
  const frente = rasterizarPagina1(o.frente, o.dpi);
  const verso = rasterizarPagina1(o.verso, o.dpi);

  const linhas = [];
  let maior = 0;
  esperadas.forEach(function (e) {
    const f = centroide(frente, o.dpi, e.x, e.y);
    // no verso, a marca física em e fica em (210 - e.x, e.y) na folha, porque o verso é espelhado
    const v = centroide(verso, o.dpi, A4.w - e.x, e.y);
    const vFisico = { x: A4.w - v.x, y: v.y };
    const dx = vFisico.x - f.x, dy = vFisico.y - f.y;
    const dist = Math.hypot(dx, dy);
    const desvioProjeto = Math.max(Math.hypot(f.x - e.x, f.y - e.y), Math.hypot(v.x - (A4.w - e.x), v.y - e.y));
    // Sanidade: a cruz tem que estar perto do lugar projetado. Longe disso, a janela pegou outra coisa.
    if (desvioProjeto > 0.5) {
      throw new Error('marca de registro em ' + e.x.toFixed(2) + ', ' + e.y.toFixed(2) + ' mm não foi achada (desvio ' +
        desvioProjeto.toFixed(2) + ' mm). Confira se o PDF foi gerado com --registro on e com o mesmo --margem.');
    }
    maior = Math.max(maior, dist);
    linhas.push({
      marca: '(' + e.x.toFixed(2) + ', ' + e.y.toFixed(2) + ')',
      frente: f,
      versoFisico: vFisico,
      dx: dx, dy: dy, dist: dist,
      desvioProjeto: desvioProjeto
    });
  });

  console.log('Marcas de registro medidas em mm (rasterização a ' + o.dpi + ' dpi, página 1).');
  console.log('marca esperada  | frente (x, y)     | verso após espelho (x, y) | dif. (dx, dy)      | distância | desvio do projeto');
  linhas.forEach(function (l) {
    console.log(
      l.marca.padEnd(15) + ' | ' +
      ('(' + l.frente.x.toFixed(3) + ', ' + l.frente.y.toFixed(3) + ')').padEnd(17) + ' | ' +
      ('(' + l.versoFisico.x.toFixed(3) + ', ' + l.versoFisico.y.toFixed(3) + ')').padEnd(25) + ' | ' +
      ('(' + l.dx.toFixed(3) + ', ' + l.dy.toFixed(3) + ')').padEnd(18) + ' | ' +
      l.dist.toFixed(3).padEnd(9) + ' | ' + l.desvioProjeto.toFixed(3)
    );
  });
  const ok = maior < o.tolerancia;
  console.log('');
  console.log('Maior diferença frente x verso: ' + maior.toFixed(3) + ' mm (tolerância ' + o.tolerancia + ' mm). ' +
    (ok ? 'OK.' : 'FALHOU.'));
  return ok ? 0 : 1;
}

module.exports = { lerPgm, centroide };

if (require.main === module) {
  try {
    process.exitCode = principal(process.argv.slice(2));
  } catch (e) {
    console.error('ERRO: ' + e.message);
    process.exitCode = 1;
  }
}
