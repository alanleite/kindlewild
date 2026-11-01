# Kindlewild

RPG de mesa com cartas para crianças pequenas, que ainda não leem bem, jogarem junto com um adulto. Cada criança cuida de uma criatura: ela ganha experiência num trilho de quadradinhos, libera golpes, pinta estrelas nos atributos e evolui trocando de carta.

O jogo foi feito para causar três sensações: **"essa criatura é minha"**, **"ela está ficando mais forte"** e **"acabei de ganhar uma coisa nova"**.

**Página:** https://alanleite.github.io/kindlewild/ (cartas de exemplo para ver e imprimir)

> Projeto em desenvolvimento. As regras ainda estão sendo calibradas em playtest, e o cenário de exemplo tem só 4 criaturas provisórias, sem arte.

## Como funciona

- **Carta A6, frente e verso**, impressa 4 por folha A4. Na frente: nome, arte, tipos, vida em corações, atributos e 4 golpes. No verso: o trilho de experiência, para marcar com lápis.
- **Quase sem texto:** só o nome da criatura e o nome dos golpes. Todo o resto é ícone, cor ou quadradinho, e o adulto lê em voz alta.
- **Combate simples:** d10 para acertar (contra a Agilidade do alvo), d4/d6/d8/d12 de dano mais Força ou Energia, menos a Defesa.
- **Crescer é visível:** cada quadradinho riscado no trilho pode liberar um golpe, dar uma estrela, um coração a mais ou o marco de evolução.

Regras completas em [`docs/especificacao.md`](docs/especificacao.md); golpes em [`docs/golpes-catalogo.md`](docs/golpes-catalogo.md).

## Núcleo e cenários

O **núcleo** é o jogo: regras, cartas, simulador e o sistema para Foundry VTT. Um **cenário** é o mundo que se joga: quais criaturas existem, seus golpes, sua arte e o mapa (`cenarios/<id>/`). O mesmo núcleo serve para qualquer cenário. Formato dos dados em [`docs/schema.md`](docs/schema.md).

## Rodando localmente

Precisa de Node 24.

```sh
npm install
npm test                         # simulador, site e validação de golpes
npx serve .                      # ou: python3 -m http.server — depois abra /site/
npm run gerar                    # PDFs de impressão em cenarios/<id>/impressao/
node sim/rodar.js 1 3            # simula batalhas entre as criaturas 1 e 3
```

Foundry VTT v14: veja [`foundry/README.md`](foundry/README.md).

## Estrutura

| Pasta | O quê |
|-------|-------|
| `docs/` | Regras, golpes, geração de trilhas, design system e formato dos dados |
| `cenarios/` | Cenários (hoje, `exemplo`) e o cenário padrão (`padrao.txt`) |
| `site/` | Cartas e impressão no navegador (HTML, CSS e JS puros) |
| `sim/` | Simulador de combate para calibrar as regras |
| `scripts/` | PDFs de impressão e validadores |
| `foundry/` | Sistema `kindlewild` para Foundry VTT |
| `pagina/` | Página inicial do GitHub Pages |
