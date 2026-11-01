# Kindlewild: RPG infantil de criaturas

RPG de cartas para crianças pequenas jogarem com um adulto: criaturas com trilho de XP, atributos, golpes e evolução. As regras estão em `docs/especificacao.md` (fonte de verdade) e o formato dos dados em `docs/schema.md`.

**Este repositório é público** (github.com/alanleite/kindlewild, com página no GitHub Pages).

## Núcleo e cenários

- **Núcleo** (tudo fora de `cenarios/`): regras, simulador, site, PDFs e sistema do Foundry. Não pode ter conteúdo de terceiros: nada de nomes, personagens, lugares, golpes ou arte de outras franquias, nem ids de cenário fixos no código. O que for de um cenário vira campo nos dados (ex.: `raro`, `escala_imagem`).
- **Cenários** (`cenarios/<id>/`): `cenario.json` (manifesto), `criaturas.json`, `tipos.json`, `imagens/`. Só entram no git os cenários com `"privado": false` (hoje, `exemplo`). O padrão fica em `cenarios/padrao.txt` ou em `KINDLEWILD_CENARIO`.
- **Cenários privados** podem estar ligados em `cenarios/` por link simbólico. O git os ignora. Nunca copie nada deles para fora da pasta deles, não mude o `.gitignore` para incluí-los e não use os dados deles como exemplo em código, testes ou documentos.

## Trava de publicação

`npm run checar` (`scripts/checar-publicacao.js`) bloqueia termos de terceiros (comparando hashes; a lista legível fica fora do repositório), imagens fora de `cenarios/<id>/imagens/` e arquivos de cenários privados. Ela roda no pre-commit desta máquina e no CI do GitHub. Se ela reclamar, corrija o conteúdo; não contorne a trava.

## Estrutura

| Pasta | O quê |
|-------|-------|
| `docs/` | Regras, catálogo de golpes, geração de trilhas, design system e `schema.md` |
| `lib/cenario.js` | Localiza e carrega o cenário (simulador, scripts e Foundry) |
| `site/` | Cartas e impressão (HTML, CSS e JS puros; `?cenario=<id>`) |
| `pagina/` | Página inicial do GitHub Pages |
| `sim/` | Simulador de combate para calibrar as regras |
| `scripts/` | PDFs de impressão (`npm run gerar`), validadores e a trava |
| `foundry/` | Sistema `kindlewild` do Foundry VTT; cada cenário vira um módulo |

Testes: `npm test` na raiz e em `foundry/`. Node vem do nvm nesta máquina (`source ~/.nvm/nvm.sh`).
