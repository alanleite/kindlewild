# Especificação: Kindlewild (v0.3)

Versão consolidada das regras e do layout. Substitui as versões anteriores das regras quando houver conflito. Itens marcados **[decidir]** ainda estão em aberto.

As fórmulas e o checklist usados para criar ou alterar trilhas ficam em [`regras-geracao-trilhas.md`](regras-geracao-trilhas.md). Toda trilha nova deve ser validada por esse documento antes de entrar no `criaturas.json` do cenário (`cenarios/<id>/criaturas.json`).

## 1. Propósito

Público: crianças pequenas, que não leem bem, jogando com um adulto (mestre ou acompanhante) que lê os nomes em voz alta.

Três sensações que o produto precisa causar:

1. "Essa criatura é minha."
2. "Minha criatura está ficando mais forte."
3. "Acabei de ganhar alguma coisa nova."

Campanha: a campanha, as espécies e o mapa vêm do cenário (`cenarios/<id>/`). Combate 1 contra 1, entre dois treinadores, cada um com uma criatura na mesa. Sem golpe em área.

## 2. Dados usados

| Dado | Uso |
|---|---|
| **d4, d6, d8** | Dano dos golpes. Só esses três. |
| **d10** | Acerto em combate (contra a Agilidade do alvo). |
| **d20** | Captura. |

Nenhum outro dado no combate.

## 3. Carta

- **Uma carta por forma, identificada pelo número da criatura (campo `id`).** Ex.: as três formas de uma mesma linha são três cartas, com três números. Evoluir = trocar de carta.
- **Sem cadeado.** Golpes e marcas que ainda não foram liberados aparecem como **quadrado vazio**. Quando a criança libera, marca o quadrado com lápis ou caneta. Funciona no papel com lápis e na borracha.
- Tamanho: A6 (105 × 148,5 mm). Impressão: A4 retrato, 4 cartas por folha, grade 2 × 2.
- **Frente e verso.**
- **Frente, de cima pra baixo:**
  1. Nome da criatura.
  2. Imagem grande (ocupa pelo menos 40% da altura).
  3. Tipos (ícones coloridos).
  4. Vida em corações.
  5. Atributos em caixas.
  6. Golpes (4), cada um com nome, ícone, dado e bolinhas quando houver uso limitado.
  7. Resistências (até 3 chips visíveis, ver seção 9).
- **Verso:** trilho de XP (50 quadradinhos), e só ele. Dá espaço pra caneta e pra ícones maiores.
- Texto permitido: só o nome da criatura e o nome dos golpes. Todo o resto é ícone, cor ou quadradinho.

## 4. Trilho de experiência

- Fica **no verso** da carta.
- **Sempre 50 quadradinhos**, pra todas as espécies. Toda criatura chega ao fim.
- Ganhar uma luta dá XP mesmo sem marca especial: a criança risca um quadradinho vazio.
- Algumas posições têm marcas. Tipos de marca:
  - **Habilidade:** libera um dos 4 golpes. O primeiro já vem liberado.
  - **Estrela:** a criança pinta +1 em um atributo à escolha, até os slots dele.
  - **Coração:** +1 de vida automático.
  - **Força:** +1 de Força automático.
  - **Poder:** +1 no resultado do dado de um golpe já liberado.
  - **Evolução:** marco que permite evoluir (opcional, com item se for o caso).
- **Distribuição:** a regra completa de geração e validação está em `docs/regras-geracao-trilhas.md`, que é a **fonte de verdade para trilhas**. Resumo:
  - Bônus de atributo (`estrela` e `forca`) têm limite de 80% (evoluível) ou 60% (não evolui) da capacidade extensível, arredondado pra baixo.
  - Primeiro bônus na posição 3 ou depois, com pelo menos 2 quadradinhos entre bônus.
  - Cerca de 60% dos bônus antes da evolução, 40% depois.
  - **Revogado:** a regra antiga de "no máximo 3 quadradinhos vazios seguidos" não é compatível com o limite de bônus. Trechos vazios longos são esperados. Não se enche o trilho com marcas extras.
  - Regras antigas, mantidas:
  - As 4 habilidades ficam espalhadas: a primeira libera no começo, as outras 3 em faixas diferentes do trilho (ex.: uma no terço inicial, uma no meio, uma no terço final).
  - Marcas de Poder caem no terço final, pra criança ter o que esperar. A posição da Evolução segue a regra de distribuição do documento (depois de cerca de 60% dos bônus), não o terço final.
  - Não repetir posições.
- **Distribuição fixa por espécie:** cada trilho é gerado uma vez com semente baseada no número da criatura e fica gravado no JSON. Assim a carta impressa é sempre igual.

## 5. Atributos

Quatro atributos:

| Atributo | Papel |
|---|---|
| **Força** | Soma ao dano de golpes físicos. |
| **Energia** | Soma ao dano de golpes elementais. |
| **Agilidade** | Chance de esquiva (ver seção 6). |
| **Defesa** | Reduz o dano recebido, contra físico e elemental. |

- Cada atributo tem **base** (vem pintada no card, a partir da espécie) e **slots** (caixas onde a criança coloca estrelas).
- **Valor = base + estrelas.** Mínimo 0. Sem valor negativo.
- Base 0 e base negativa: base negativa vira 0. Não existe penalidade abaixo de zero.
**Slots por espécie (variável, de 2 a 5):**

- **2 slots:** forma inicial que ainda vai evoluir.
- **3 slots:** forma intermediária.
- **4 slots:** última evolução de uma linha, ou espécie sem evolução comum.
- **5 slots:** espécies raras (lendárias, únicas, de linha sem evolução própria). Têm mais espaço pra crescer ao longo da campanha.

**Diferença por estágio (essencial):** cada forma evoluída fica mais forte de forma visível, não só com número maior. Regra mínima por forma:

- **Dado do golpe sobe um degrau por forma:** d4 → d6 → d8.
- **Um golpe novo por forma:** a forma evoluída traz pelo menos um golpe que a anterior não tinha.
- **+1 de vida por forma**, além do que vem do trilho.
- As três formas de uma mesma linha ficam claramente diferentes entre si: dado, golpes e vida.

Espécies sem evolução usam o dado de acordo com a força: d6 pra comuns, d8 pra raras ou com golpes especiais.

## 6. Combate

**Acerto:**
- O atacante rola d10.
- Acerta se igualar ou superar a **Agilidade** do alvo.
- Agilidade 0: sempre acerta. Agilidade 8: esquiva em 70%.

**Dano:**
1. Rola o dado do golpe (d4, d6 ou d8) e soma o atributo do tipo do golpe (Força se físico, Energia se elemental).
2. Aplica o efeito de tipo do alvo: vulnerável ×2, resistente metade (arredondada pra cima), imune zero.
3. Subtrai a Defesa do alvo.
4. Resultado negativo vira 0. Empate (zero depois da defesa) vira 1.

**Golpe de exemplo:** Arranhão, dado d6, categoria física. Com Força 2: 1d6 + 2.

**Golpes com usos limitados** (ex.: Esguicho): bolinhas no card. Golpes básicos: usos infinitos.

## 7. Vida e recuperação

- **Unidade: 1 coração = 1 ponto de dano.** Dano que sobra depois da defesa tira corações, um por um.
- Vida inicial alta. Escala de referência: criatura pequena e frágil 7, forma final robusta 12–13, criatura muito resistente 15–16. **Vida é o principal ajuste de balanceamento.**
- Coração no trilho: +1 de vida.
- **Centro de Cura:** recupera todos os corações e todos os usos de golpe.
- **Descanso fora do Centro:** recupera metade dos corações (arredondada pra cima). Golpes limitados só se recuperam com uma marca específica da carta **[decidir]** (ícone de descanso ao lado de alguns golpes).

## 8. Captura

- Usa **d20**. Cada espécie tem uma **CA base** (número mínimo que precisa tirar). Padrão: CA 17 (20%). Criatura rara muito poderosa: CA 20 (5%).
- **Limiares pela vida atual do selvagem:**
  - Até 50% da vida: −1 na CA (25%).
  - Até 20% da vida: −2 na CA (30%).
  - Teto de 30% em qualquer caso.
- **Ajustes narrativos:** raivoso +1 ou +2 na CA; já amigável −1 ou −2. Por espécie, não regra fixa.
- **Três tentativas:** cada tentativa de captura é uma rolagem. Três falhas e a criatura foge.

## 9. Resistências

- Cada espécie tem tipos e pode ter resistências e vulnerabilidades. Efeitos: **vulnerável** (×2), **resistente** (metade, arredondada pra cima), **imune** (zero).
- **Problema de layout:** espécies têm 6 a 7 resistências. Isso é muito pra um card pequeno e pra criança.
- **[decidir]** Opções:
  - a) Mostrar no card só as 3 mais relevantes, e o restante na legenda/ficha.
  - b) Agrupar por categoria (ex.: "fogo e planta", "água e gelo"), com um ícone por grupo.
  - c) Mostrar tudo, mas em grade de ícones grandes com cor.
- Legenda obrigatória: uma página de referência (ou faixa no verso) mostrando o que cada ícone e cada cor significam. Pode ter texto, porque é pro adulto.

## 10. XP impresso

- Cada espécie tem um valor de XP impresso no card: quadradinhos que ela dá quando derrotada. Ex.: uma criatura rara muito poderosa dá 3.
- **O mestre controla a entrega.** Pode dar menos, zero, ou dar por participação relevante.
- Trocar de criatura no meio da batalha divide o XP, arredondando pra baixo, mínimo 1.

## 11. Layout e design system

- **Cores:** cada tipo tem uma cor. Estados (pintado, vazio, bloqueado, uso esgotado) têm cores e formas distintas, não só cinza.
- **Ícones:** no mínimo 1 cm pra qualquer ícone clicável ou marcável. Traço grosso, sem detalhes finos.
- **Espaçamento:** 4 mm entre os blocos principais da frente. Espaçamentos internos de cada bloco seguem o design system para caber na carta A6. Quadradinhos do trilho com espaço suficiente pra caneta.
- **Hierarquia:** a imagem da criatura é o elemento dominante. Nome em destaque. Resto em segundo plano.
- **Legibilidade:** nome da criatura com pelo menos 14 pt; nome do golpe menor, com cerca de 12 pt e no máximo 2 linhas. Não há outro texto na carta impressa.
- **Impressão:** fundo branco, cor preservada, nada depende de fundo colorido pra ser entendido (o papel é branco).

## 12. Critérios de avaliação do site

O agente de loop avalia o site contra estes critérios. Cada item é verificável por olho ou por código:

1. Trilho: nenhuma sequência de mais de 3 quadradinhos vazios seguidos; marcas espalhadas pelo trilho inteiro, não agrupadas no começo.
2. Texto: só nome da criatura e nome dos golpes. Nada mais.
3. Ícones: no mínimo 1 cm; cor por tipo; legíveis em impressão.
4. Resistências: no máximo 3 ícones visíveis na carta (ou o que for decidido em 9).
5. Diferenciação: duas espécies da mesma linha evolutiva não podem ter o mesmo perfil de atributos e dados.
6. Espaçamento: 4 mm entre os blocos principais da frente; distâncias internas seguem o design system.
7. Impressão: 4 cartas por folha A4 retrato, sem corte de conteúdo, sem quebra de página no meio de uma carta.
8. Hierarquia: imagem ocupa pelo menos 40% da altura da carta.

## 13. Pendências


- Resistências no card (opções a, b, c da seção 9). **Não decidido.**
- Golpes com usos: como se recuperam fora do Centro (marca específica ou não).
- Valores finais de vida, CA e slots por espécie: rascunho, a calibrar.
- **Crítico:** natural 10 no d10 do acerto dá +1 ou +2 de dano. Sugestão do crítico, ainda não confirmada.
- Idioma: português como principal, opção em inglês depois.
- Stack: HTML e JavaScript puros, com Next.js como opção futura.

## 14. Decisões fechadas nesta versão

**Layout (decisões do autor, 2026-10-04):**
- Espaçamento entre blocos: **4 mm**.
- Vida máxima: **16 corações**. Nenhuma espécie passa disso.
- Nome do golpe: **menor que a versão anterior (4,2 mm)**. Isso passa por cima do mínimo de 14 pt da seção 11. É decisão consciente do autor, não erro.

**Assumidas pela recomendação (você não respondeu, confirma ou troca):**
- Habilidades por carta: **4**, primeira na posição 1.
- Evolução: cópia **integral** dos atributos (valor atual). Sem perda por slot menor.
- Agilidade efetiva **máxima de 8** (esquiva máxima de 70%).
- Imune é **sempre 0**. O empate (vira 1) só acontece quando a Defesa zera um golpe que acertou.


- Evolução troca de carta. **A carta nova começa com trilho vazio, sempre, sem histórico.** Nenhum progresso de XP é transferido. Motivo: uma forma já evoluída capturada na selvagem começa exatamente como uma carta nova, então a regra precisa valer nos dois casos.
- Consequência: habilidades, estrelas e poderes adquiridos na forma anterior não passam pra nova carta. Cada forma começa do zero, com o primeiro golpe liberado.
- **Atributos na evolução (mínimos e limiares):**
  - Os **valores da forma anterior viram o mínimo** da nova forma. Ex.: uma forma intermediária com 2 de Força e 3 de Energia → a forma final começa com pelo menos 2 e 3.
  - Os **limiares de crescimento** (até onde cada atributo pode subir) vêm da espécie nova. Ex.: a forma final sobe até 3 de Força e 4 de Energia.
  - A proporção entre os atributos se mantém. A espécie nova muda o teto, não a identidade.
  - Regra geral: o limiar da forma nova é **sempre igual ou maior** que o da anterior.
  - Exceções por espécie são permitidas, para saltos grandes de proporção (ex.: criatura que ficou muito maior ou mais forte). Cada exceção precisa ser marcada nos dados.
  - Não há +1 de evolução. O ganho vem do dado maior, do golpe novo, da vida e dos novos limiares.
  - Se a forma nova tiver menos slots que as estrelas já colocadas num atributo, o excedente é **perdido**. (Assumido, você não falou sobre isso. Confirma.)
  - Formas base (sem evolução anterior) usam a base da própria espécie.

- Unidade de vida: 1 coração = 1 ponto de dano.
- Slots: variável por espécie, de 2 a 5 (ver seção 5).
- Diferença por estágio: dado sobe um degrau, golpe novo, +1 de vida por forma.
- Distribuição do trilho: fixa por espécie (gerada uma vez). **Assumido**, você não respondeu esse ponto explicitamente.


## 15. Golpes (2026-10-04)

Fonte de verdade: `docs/golpes-catalogo.md` (construtor de golpes, aprovado).
- Dados de dano: **d4, d6, d8 e d12** (d12 só em forma final ou rara). Revoga "só d4, d6 e d8".
- Revoga "o dado sobe um degrau por forma": a evolução sobe o orçamento de pesos dos golpes.
- Golpe 1 sempre ilimitado. Efeitos: Fraqueza, Veneno, Paralisia, Sono, Ligeiro, Escudo, Força Extra, Cura. Golpes em área acertam todos os inimigos.
