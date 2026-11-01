# Kindlewild: sistema para Foundry VTT v14

Ficha de criatura em formato de carta e rolagem de golpes no chat. O sistema não traz criaturas: elas vêm de um **módulo por cenário** (ex.: `kindlewild-exemplo`), gerado a partir de `cenarios/<id>/`.

## Comandos (rodar dentro de `foundry/`)

- `npm install`: instala o empacotador de compêndios do Foundry.
- `npm test`: testa regras, conversor, manifestos e o compêndio do cenário padrão.
- `npm run gerar [-- --cenario <id>]`: gera o módulo do cenário em `cenarios/<id>/foundry/` (`module.json`, compêndio e imagens) a partir de `cenarios/<id>/criaturas.json`. Sem `--cenario`, usa `cenarios/padrao.txt`.
- `npm run deploy [-- --cenario <id>]`: copia o sistema para `systems/kindlewild` e o módulo para `modules/<modulo>` dentro de `$FOUNDRY_DATA` (padrão: `~/services/foundry/data/Data`), sem tocar no compêndio já instalado. `npm run deploy -- --packs` também substitui o compêndio: só com o mundo fechado.

Na primeira instalação, reinicie o servidor Foundry para ele reconhecer o sistema e o módulo, e ative o módulo do cenário no mundo. Depois, a cada deploy, basta recarregar o mundo (F5). Compêndios só atualizam com o mundo fechado.

## Uso na mesa

- Ficha (aba Carta): clique nos corações e nas caixinhas de atributo; o quadrado ao lado do golpe libera o golpe; clique no golpe para rolar.
- Aba Trilho: clique na casa até onde a criatura chegou. A vida máxima acompanha os corações do trilho.
- Centro de Cura: vida e cargas ao máximo. Descanso: recupera metade da vida máxima.
- Selecione um alvo (tecla T sobre o token) antes de rolar para ver Agilidade, Defesa e resistência dele no chat.
