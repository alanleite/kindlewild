# Design system da carta (v0.5)

Tokens usados em `site/style.css`. Medidas em mm, porque a carta é impressa em A6 (105 × 148,5 mm). No CSS, a unidade `--u` vale 1 mm da carta.

Mudanças desta versão (feedback do autor, rodada 3):
- Golpe: ícone de 1 cm como foco, nome pequeno, dado em notação textual (`d4`, `d6`, `d8`) e "+" com o ícone do atributo.
- Vida: corações de 7 mm, 8 por linha, até 2 linhas.
- Resistências: saem da linha e vão para o canto inferior direito da imagem, com metade do tamanho.
- Golpes: bloco mais baixo (41,2 mm, antes 48,1 mm).

Decisões fechadas na continuação da rodada:
- 6,1 mm entre os blocos principais da frente.
- Vida máxima de 16 corações; a única espécie do cenário de testes com 17 foi ajustada para 16.
- Nome do golpe menor que a versão anterior (4,2 mm): agora **3,6 mm (~10 pt)**, em até 2 linhas. Decisão do autor; passa por cima do mínimo de 14 pt da seção 11 da especificação.
- Espaço entre blocos da frente: **6,1 mm** em todos os três vãos (imagem → vida, vida → atributos, atributos → golpes). Para caber, as caixas de atributo foram de 3,6 para **2,6 mm**. Os corações foram reduzidos de 10 para 7 mm (pedido do autor), o que liberou espaço para o vão de 6,1 mm.

## 1. Cores

### Cores de tipo (uma por tipo, usadas no disco do tipo e no fundo suave)

| Tipo | Token | Hex |
|---|---|---|
| Elétrico | `--tipo-eletrico` | #f7c600 |
| Fogo | `--tipo-fogo` | #f0622a |
| Água | `--tipo-agua` | #3b8ee6 |
| Planta | `--tipo-planta` | #3ea650 |
| Terra | `--tipo-terra` | #b98b52 |
| Gelo | `--tipo-gelo` | #7fd8ea |
| Voador | `--tipo-voador` | #9bb8ef |
| Veneno | `--tipo-veneno` | #9a4fc4 |
| Psíquico | `--tipo-psiquico` | #e95b9a |
| Pedra | `--tipo-pedra` | #a9a17e |
| Normal | `--tipo-normal` | #c4c4b4 |
| Lutador | `--tipo-lutador` | #c8553d |
| Inseto | `--tipo-inseto` | #9bc23c |
| Fantasma | `--tipo-fantasma` | #6f5ea8 |
| Dragão | `--tipo-dragao` | #5b4fd8 |

Os ícones dentro dos discos são sempre na cor de tinta (`--cor-linha`), para ler bem sobre qualquer cor de tipo. Em impressão P&B, a forma do ícone diz o tipo.

### Cores de marca do trilho

| Marca | Token | Uso |
|---|---|---|
| Habilidade | `--marca-habilidade` | azul claro |
| Estrela | `--marca-estrela` | amarelo |
| Coração | `--marca-coracao` | vermelho claro |
| Força | `--marca-forca` | laranja claro |
| Poder | `--marca-poder` | roxo claro |
| Evolução | `--marca-evolucao` | verde claro |

### Cores de sistema

`--cor-folha` (fundo branco da carta), `--cor-linha` (tinta: contornos e ícones), `--cor-linha-suave` (contorno secundário), `--cor-texto`, `--cor-texto-suave`, `--cor-coracao`, `--cor-destaque` (símbolo dos chips de efeito).

Não há cinza nos estados da carta. A cor de estado foi removida (`--cor-bloqueado` não existe mais).

Modo escuro: redefine só os tokens de tela. A impressão força o bloco claro no fim de `style.css`.

## 2. Escala de espaçamento

Múltiplos de 1 mm. Cada token é `calc(var(--u) * n)` na carta.

| Token | mm | Uso |
|---|---|---|
| `--esp-1` | 1 | separação dentro de linhas (colunas de atributo, tipos) |
| `--esp-2` | 2 | padding interno de linhas, faixa do nome |
| `--esp-4` | 4 | margem interna da carta (lateral) |

Espaço entre blocos da frente: **6,1 mm**. Dentro dos blocos: golpes contíguos, 0,5 mm entre corações na mesma linha, 1 mm entre linhas de corações, 1 mm entre discos de tipo, 0,6 mm entre caixas de atributo e 2 mm entre o ícone do atributo e suas caixas.

## 3. Tipografia

| Papel | Tamanho | Peso |
|---|---|---|
| Nome da criatura | 5,4 mm (~15 pt) | 800 |
| Nome do golpe | 3,6 mm (~10 pt), até 2 linhas | 700 |
| Texto da legenda (tela, para adulto) | 4 mm (~11 pt) na impressão da legenda | 400 |

O nome da criatura mantém pelo menos 14 pt. O autor decidiu que o nome do golpe deve ser menor que 4,2 mm: agora 3,6 mm (~10 pt), em até 2 linhas. Além dos nomes, só a notação curta dos dados (`d4`, `d6`, `d8`) aparece como texto na carta.

## 4. Tamanhos de ícone e alvo

| Elemento | Tamanho | Lado | Motivo |
|---|---|---|---|
| Disco de tipo (com ícone) | 6,4 mm | barra do nome | até 2, no canto esquerdo |
| Coração | 7 mm | frente | reduzido 30% a pedido do autor, 8 por linha |
| Quadrado de liberação do golpe | 10 mm | frente | alvo de caneta (1 cm) |
| Ícone do golpe | 10 mm | frente | ícone de 1 cm, foco da linha |
| Ícone de atributo (no golpe e na coluna) | 8 mm | frente | mesmo tamanho nos dois lugares |
| Dado (`d4`, `d6` ou `d8`) | coluna de 8 mm | frente | texto em negrito dentro da linha do golpe |
| "+" entre dado e atributo | 3 mm | frente | símbolo, não é alvo |
| Chip de resistência (disco do tipo) | 5,75 mm | sobre a imagem | cerca de 15% maior que a versão anterior |
| Símbolo do efeito no chip | 2,4 mm | sobre a imagem | metade do tamanho anterior (4,6 mm) |
| Caixa de atributo | 2,6 mm | frente | alvo de caneta, reduzida para caber o espaço de 4 mm; ver seção 7 |
| Bolinha de uso | 3,4 mm | frente | alvo de caneta; ver seção 7 |
| Quadradinho do trilho | 10 mm | verso | alvo de caneta (1 cm) |
| Marca dentro do quadradinho | 6,5 mm | verso | ícone da marca, mesmo tamanho do ícone de área do golpe |

Regra geral: ícone que a criança lê com o olho tem no mínimo 8 mm. Alvo de caneta tem 1 cm sempre que cabe. Chip e símbolo de resistência não são marcados, por isso ficam abaixo de 1 cm (pedido do autor: metade do tamanho).

## 5. Estados

| Estado | Como aparece | Onde |
|---|---|---|
| **Pintado** | caixa cheia com a tinta, ou quadradinho com a cor da marca | atributos, trilho |
| **Vazio** | contorno fino, fundo branco | caixas, quadradinhos, golpe não liberado |
| **Marcado** | quadrado com um traço dentro | golpe liberado |
| **Esgotado** | bolinha com X | bolinhas de golpe já usadas (só na legenda; a carta impressa não marca uso) |
| **Próximo** | borda dupla | quadradinho do trilho em `inicio` |

Estado nunca depende só de cor: cada estado tem forma (cheio, vazio, traço, X, borda dupla).

Golpe não liberado: quadrado vazio, sem cor de fundo do tipo. Sem cadeado e sem cinza.

## 6. Decisões

### 6.1 Resistências (chips)

Campo `resistencias` (ver `docs/schema.md`). Mostra **até 3 chips**, na ordem: vulnerável, imune, resistente. Cada chip é um disco de 5,75 mm com o tipo e o símbolo do efeito (2,4 mm) no canto.

Ficam no **canto inferior direito da imagem**, sobre a arte, e não ocupam linha própria. Não há símbolo de "mais": a lista completa está na ficha da legenda (`legenda.html`).

### 6.2 Trilho no verso

O trilho de 70 quadradinhos fica **no verso**, 7 colunas por 10 linhas, quadradinho de 10 mm, 4 mm entre quadradinhos. Ocupa 94 × 136 mm, centralizado. O verso não tem texto.

Verso espelhado: as folhas de frente e de verso são separadas. Com impressão pela borda longa, o verso do slot 0 é a carta do slot 1, e assim por diante (`espelharVerso` em `site/selecao-impressao.js`).

### 6.3 Seleção para impressão

Antes das folhas, a tela apresenta uma lista pesquisável com as criaturas do cenário (151 no cenário de testes). Todos começam marcados; o usuário pode limpar a seleção, buscar por nome ou número e marcar somente as cartas desejadas. A prévia é remontada automaticamente na ordem do número da criatura, em grupos de quatro. Um grupo incompleto preserva os slots vazios, e o verso espelha inclusive esses vazios para continuar alinhado à frente. O painel de seleção não aparece no papel.

Regras de geração do trilho (fixadas por espécie), derivadas da seção 4 da especificação:

- 70 posições. A distribuição segue `docs/regras-geracao-trilhas.md`.
- Habilidades, melhorias e evolução são lidas diretamente da trilha de cada espécie.
- Nenhuma posição repetida.

O site confere essas regras em cada carta e mostra o aviso no cabeçalho. Nesta rodada, o `criaturas.json` do cenário de testes passa em todas elas.

### 6.4 Dados dos golpes

Só d4, d6 e d8 (especificação, seção 2). O dado aparece em notação textual direta — `d4`, `d6` ou `d8` — em negrito. Nenhum outro valor recebe rótulo; o site avisa no console.

### 6.5 Estágio

A carta mostra o estágio com 1 a 3 bolinhas no canto inferior esquerdo da imagem, sem texto. O estágio vem da cadeia de evolução presente na lista de espécies.

### 6.6 Atributos de forma evoluída

`atributos: null` e `herda_atributos: true` nas formas evoluídas. As caixas saem **vazias**: o valor é herdado na evolução. Os slots dessa forma vêm do estágio (inicial 2, intermediária 3, última 4, sem evolução 4), porque o dado não traz o número. Formas base usam a base pintada.

As caixas mostram o perfil de cada espécie a partir de `atributos.base` e `atributos.slots`. O layout não assume valor igual entre espécies. Que os atributos de cada espécie pareçam padronizados vem dos dados, não do layout.

### 6.7 Golpe: ícone, nome, dado e soma

Cada golpe é uma linha de 10 mm, nesta ordem:

1. Quadrado de liberação (10 mm; vazio ou marcado).
2. Ícone do golpe (10 mm, foco da linha).
3. Nome (3,6 mm, até 2 linhas).
4. Dado: texto `d4`, `d6` ou `d8` em uma coluna de 8 mm.
5. "+" (3 mm) e ícone do atributo (10 mm): **Força** se `categoria` é `fisico`, **Energia** se é `elemental`.
6. Bolinhas de uso (só nos golpes com `usos`; largura fixa de 12 mm para alinhar as linhas).

### 6.8 Imagem

A caixa da imagem tem 46,9 mm. No cenário de testes, todos os 151 PNGs têm 475 px com margem de 22 px, e a maior dimensão visível é de 431 px em todos. Por isso a altura visível do artwork é igual em todas as espécies.

A **área** visível muda com o desenho: de 1,9% da carta (a silhueta mais fina) a 9,0% (a mais cheia). Não é margem: o formato da silhueta é que muda. Trim (recorte de margem) não muda nada nas medidas.

O site normaliza o tamanho percebido pelo campo opcional `escala_imagem` de cada criatura no `criaturas.json` (padrão 1), lido por `site/escala-imagens.js`. O cenário escolhe artes de referência, que ficam em escala 1 (no cenário de testes, a primeira linha evolutiva, números 1 a 3). Artes com área abaixo da forma final da referência recebem um fator calculado pela raiz da proporção entre áreas, arredondado a duas casas. Só entram fatores a partir de 1,05 e o teto é 1,18, para ampliar as silhuetas pequenas sem cortes perceptíveis. Os PNGs originais não são modificados; o fator é aplicado apenas no layout da carta.

### 6.9 Vida

Até 16 corações, em 2 linhas de 8 (7 mm cada). A linha de vida tem sempre 15 mm, para as cartas ficarem alinhadas. O teto dos dados é 16; o site mantém o aviso como proteção contra dados inválidos.

## 7. Medidas da frente e do verso

A carta tem 105 × 148,5 mm. Frente, de cima pra baixo:

| Bloco | Altura (mm) |
|---|---|
| Topo: imagem (com a faixa do nome por cima; resistências no canto inferior direito) | 59,4 (40%) |
| Espaço entre blocos (6,1 mm) | 6,1 |
| Linha de vida: corações centralizados (2 linhas de 8, 7 mm cada, 1 mm entre linhas) | 15 |
| Espaço entre blocos (6,1 mm) | 6,1 |
| Atributos (ícone 8 + respiro 2 + caixas 2,6) | 12,6 |
| Espaço entre blocos (6,1 mm) | 6,1 |
| Golpes: 4 linhas contíguas de 10 | 40 |
| Margem de baixo do corpo | 3 |
| **Total** | **148,3** |

Vãos imagem → vida, vida → atributos e atributos → golpes = 6,1 mm cada (antes 4 mm). Os corações menores (7 mm) e a linha de vida de 15 mm liberaram o espaço, redistribuído nos três vãos para a carta não ficar com sobra embaixo. As quatro linhas de golpe permanecem contíguas, e o ícone de cada atributo tem 2 mm de respiro antes das caixas. A margem lateral do corpo é de 3 mm; a inferior também. Não remedido no navegador após esta mudança.

## 8. Referências (o que foi aproveitado)

Pesquisa feita por resumo de busca (não li as páginas completas). Os pontos abaixo são os que apareceram de forma consistente nos resumos:

1. **Anatomia de carta colecionável** (mintvandal.com/guides/card-anatomy). Aproveitado: nome no topo, arte no centro, símbolo de tipo sempre no mesmo canto, golpes no meio, informação de rodapé.
2. **"How to Design Professional Looking Trading Cards" (2026) e "How To Design Top Level Trading Cards"** (tradingcardprinting.com). Aproveitado: moldura consistente que liga a coleção toda, e "deixar respiro em volta da foto". Adotado: filete neutro de corte e barra branca para o nome.
3. **"Trading Card Design Tips: 3 lessons from MTG's success"** (qpmarketnetwork.com). Aproveitado: limitar a 2 ou 3 cores principais e usar forma e posição para hierarquia, não só cor. Adotado: disco de tipo com forma distinta por tipo, e estados com forma.
4. **"How to Make Trading Cards: Design to Print"** (4over4.com/guide/how-to-make-trading-cards). Aproveitado: zona de segurança para o conteúdo, longe das bordas de corte.

## 9. Arquivos

- `docs/design-system.md` (este arquivo)
- `site/style.css`: tokens em `:root`, frente e verso, legenda e bloco de impressão
- `site/app.js`: montagem da frente (tipos na barra, linha de vida, chips sobre a imagem, golpe com dado textual e soma), do verso e das folhas, validação de cada carta
- `site/apresentacao-carta.js`: regras puras da apresentação dos tipos no cabeçalho e da notação textual dos dados
- `site/escala-imagens.js`: lê o campo opcional `escala_imagem` de cada criatura (padrão 1) e aplica a ampliação na carta
- `site/icones.js`: mapa de ícones (tipos, golpes, atributos, trilho, efeitos, símbolo "+", marcado e desenhos legados de dados)
- `site/legenda.html` e `site/legenda.js`: página de legenda para adulto (texto permitido)
- `site/fixtures/criaturas-exemplo.json`: 3 espécies de teste (uma forma base, uma forma evoluída e uma rara)

## 9. Linha de golpe com efeito, área e cargas (2026-10-04)

Colunas fixas dentro da caixa do golpe (mm): ícone 10 | nome (resto) | dado 9 | "+" 2,5 | atributo 8 | efeito 7,5 | área 6,5 | cargas 4. Bolinhas de carga de 2,6 mm empilhadas na vertical (máx. 3). Tokens de efeito: disco colorido com desenho (fraqueza cinza/seta baixo, veneno roxo/gota, paralisia amarelo/raio, sono azul/Z, ligeiro ciano/pena, escudo laranja/escudo, força extra vermelho/seta cima, cura verde/coração). Dado inclui `d12`.
