# Cartas do Kindlewild (site de impressão)

Site estático que permite escolher e monta as cartas das criaturas do cenário em folhas A4. Cada carta é A6 (105 × 148,5 mm) e tem frente e verso. Uma folha A4 retrato tem 4 cartas (grade 2 × 2). Sem framework e sem build: `index.html`, `legenda.html`, `style.css`, `app.js`, `apresentacao-carta.js`, `selecao-impressao.js`, `cenario-web.js`, `escala-imagens.js`, `legenda.js` e `icones.js`.

Regras visuais (tokens, tamanhos de ícone, estados, decisões): `docs/design-system.md`. Regras de jogo (trilho, atributos, resistências): `docs/especificacao.md`.

## Como rodar

O site lê as criaturas de um cenário (`../cenarios/<id>/criaturas.json`) com `fetch`. O cenário vem de `?cenario=<id>` ou, sem parâmetro, de `cenarios/padrao.txt` (ver `cenario-web.js`). Navegadores bloqueiam `fetch` quando o arquivo é aberto direto do disco (`file://`), então é preciso servir a pasta do projeto. Na raiz do projeto (`kindlewild/`):

```sh
python3 -m http.server
```

Depois abra:

- http://localhost:8000/site/ (cartas)
- http://localhost:8000/site/legenda.html (legenda, para o adulto)

Se abrir o `index.html` com duplo clique, a página mostra uma mensagem explicando isso.

## Dados alternativos

Para escolher o cenário: http://localhost:8000/site/?cenario=exemplo

Para testar com outro arquivo, passe `?dados=` com caminho relativo a `site/` (as imagens são procuradas na pasta desse arquivo):

- http://localhost:8000/site/?dados=fixtures/criaturas-exemplo.json

O fixture `fixtures/criaturas-exemplo.json` (formato novo de golpe) tem 4 criaturas fictícias, sem imagem (aparece o círculo tracejado), e segue a especificação (seção 4 para o trilho):

- **Brotinho (1):** forma base. Golpes d4, atributos com base pintada.
- **Brotão (2):** forma evoluída. `atributos: null` e `herda_atributos: true`, então as caixas saem vazias.
- **Mentalix (3):** espécie rara, com 5 slots nos atributos, vida 16, d12, área, suporte e um ícone de golpe inexistente (testa o placeholder).
- **Mutalu (4):** evolui com pedra, marco na posição 40.

O fixture não substitui o cenário.

## Como imprimir (frente e verso)

A carta tem frente e verso. Use **Escolher criaturas** para buscar e marcar apenas as cartas desejadas. Todos começam selecionados; **Limpar seleção** permite começar do zero. Cada grupo de 4 selecionados gera **duas folhas seguidas**: a folha de frente e a folha de verso. Elas são impressas uma depois da outra e devem ficar no mesmo papel, uma de cada lado.

1. Clique em **Imprimir selecionados** (ou Ctrl/Cmd + P).
2. Papel: **A4**, orientação **retrato**. Margens: **nenhuma**. Escala: **100%**.
3. Desmarque **Cabeçalhos e rodapés** (o navegador imprime data, título e URL por padrão).
4. Marque **Gráficos de fundo** (ou "Imprimir cores e imagens de fundo"), para as cores de tipo e as marcas saírem.
5. Em **Frente e verso** (ou "Dos dois lados"), escolha **virar pela borda longa** (lateral esquerda ou direita, como um livro). Não escolha a borda curta: o verso sairia de cabeça para baixo.
6. Corte pelas linhas claras de cada carta.

O verso de cada folha já sai espelhado nas colunas. Assim, cada verso fica atrás da carta de frente certa quando a folha é virada pela borda longa.

Se a impressora não faz frente e verso automático, as páginas ímpares são as frentes e as páginas pares são os versos. Imprima primeiro somente as ímpares. Recoloque as folhas na bandeja e imprima somente as pares, virando pela borda longa. A posição e a ordem de reinserção variam conforme a impressora; faça primeiro um teste com uma única folha (páginas 1 e 2) antes de imprimir o conjunto inteiro.

O CSS usa `@page { size: A4 portrait; margin: 0 }` e uma quebra de página depois de cada folha.

## Controles

- **Escolher criaturas:** busca por nome ou número e inclui ou remove cada criatura da impressão. A prévia é reorganizada automaticamente na ordem do número.
- **Selecionar todos / Limpar seleção:** altera todas as caixas de uma vez. Com nenhuma carta selecionada, o botão de impressão fica desativado.
- **Folha:** pula para a folha escolhida (a de frente).
- **Habilidades liberadas:** quantos golpes já estão liberados. O padrão é 1 (o primeiro golpe já vem liberado). Os golpes além desse número saem com o quadrado vazio.
- **Aviso de trilho:** aparece no cabeçalho quando alguma carta está fora de uma regra (trilho, golpes, dados ou perfil da linha evolutiva). Os detalhes estão no `title` do aviso e no console.

## Como a carta lê os dados

Cada campo do `criaturas.json` está descrito em `docs/schema.md`. Pontos que o site decide sozinho:

- **Texto:** a carta tem o nome da criatura, o nome dos golpes e a notação dos dados (`d4`, `d6`, `d8`, `d12`). O verso não tem texto. Todo o resto é ícone, cor ou quadradinho.
- **Imagem:** `imagem` é relativa à pasta do arquivo de dados (no cenário: `imagens/025.png`). Se o arquivo não existir, aparece um círculo tracejado. A área da imagem (faixa do nome incluída) ocupa 40% da altura da carta: 59,4 mm. O campo opcional `escala_imagem` da criatura (lido por `escala-imagens.js`, teto 1,18) amplia de forma conservadora as silhuetas visualmente pequenas, sem alterar os PNGs (ver `docs/design-system.md`, seção 6.8).
- **Estágio:** 1 a 3 bolinhas no canto inferior esquerdo da imagem, pela cadeia de evolução da lista.
- **Tipos:** um disco pequeno por tipo, com ícone, no canto esquerdo da barra branca do nome. A cor fica concentrada nos discos e no fundo suave da imagem; as bordas da carta são neutras para não interferir no corte.
- **Vida:** um coração de 1 cm por ponto (área de toque da caneta), 8 por linha, até 2 linhas. O teto dos dados é 16, exatamente o que cabe na carta.
- **Resistências:** campo `resistencias`, com valores `vulneravel`, `imune` e `resistente`. A carta mostra até 3 chips no canto inferior direito da imagem, vulneráveis primeiro, depois imunes e depois resistentes. A ficha completa fica em `legenda.html`.
- **Atributos:** uma coluna por atributo, com ícone e uma caixa por slot. Forma base: `base` pinta as caixas. Forma evoluída (`atributos: null`): as caixas saem vazias, porque o valor é herdado. Os slots dessa forma vêm do estágio (inicial 2, intermediária 3, última 4, sem evolução 4), porque o dado não traz número. Base negativa vira 0.
- **Golpes:** formato `{ nome, icone, elemento, atributo, dado, cargas, efeito, area, peso, liberado_em }` (ver `docs/golpes-catalogo.md`); o formato antigo (`tipo`/`categoria`/`usos`) ainda é aceito. Cada linha: quadrado de liberação, ícone do golpe (placeholder tracejado se não existir no mapa), nome, dado (`d4`, `d6`, `d8`, `d12`), "+" e ícone de Força ou Energia, token do efeito (8 efeitos, em `icones.js`, grupo `efeito`), ícone de área (vários alvos) e bolinhas de carga (3, 2 ou 1; ilimitado sem bolinhas). Suporte (`dado: null`) mostra só o efeito. Elemento dá a cor do fundo.
- **Trilho (verso):** 70 quadradinhos, em 7 colunas por 10 linhas, cada um de 10 mm. O quadradinho **próximo** tem borda dupla e é a posição `inicio`.

### Avisos de regra

O cabeçalho mostra quantas cartas estão fora da regra, e o `title` do aviso lista os motivos. Os motivos conferidos são: trilho (seção 4 da especificação), golpes e dados, perfil igual ao da forma anterior e vida acima do que cabe na carta. O site não reescreve os dados.

## Ícones

Todos os ícones ficam em `icones.js`, num mapa por grupo: `tipo`, `golpe`, `atributo`, `trilho`, `efeito`, `dado`, `simbolo`, `geral`. Cada entrada é um SVG de traço simples (24 × 24, cor = `currentColor`). Para trocar um ícone, substitua o SVG da chave.

Chave sem desenho no mapa mostra o **placeholder**: um quadrado arredondado tracejado. Assim a carta nunca mostra texto no lugar do ícone.

## Validação

```sh
node site/validacao.js
```

Confere a escala das imagens, a lógica da seleção para impressão e a apresentação das cartas: dados em notação textual válida e até dois tipos no cabeçalho.
