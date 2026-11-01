# Schema dos dados

Os dados de jogo ficam no cenário, em `cenarios/<id>/`. Fonte única das cartas: `cenarios/<id>/criaturas.json` (uma carta por espécie). Tipos: `cenarios/<id>/tipos.json`. Imagens: `cenarios/<id>/imagens/`. Cada campo abaixo é obrigatório, salvo quando marcado como opcional.

Todas as espécies estão com `"status": "rascunho"`. Quando aprovar, troca pra `"aprovado"`.

## Estrutura de um cenário

```text
cenarios/
  padrao.txt          id do cenário padrão (ex.: exemplo)
  <id>/
    cenario.json      manifesto do cenário
    criaturas.json    lista de criaturas (este schema)
    tipos.json        lista de tipos do cenário
    imagens/          artes das cartas (NNN.png)
```

O cenário padrão vem da variável de ambiente `KINDLEWILD_CENARIO` ou, se ela não existir, de `cenarios/padrao.txt`.

O cenário pode ter outras pastas próprias (mapas, impressão, propostas de calibração, módulo do Foundry). Elas não fazem parte do núcleo.

### `cenario.json`

```json
{
  "id": "meu-cenario",
  "nome": "Meu cenário",
  "descricao": "Uma frase sobre o cenário.",
  "privado": false,
  "foundry": {
    "modulo": "kindlewild-meu-cenario",
    "titulo": "Kindlewild: Meu cenário",
    "pack": "criaturas",
    "rotulo": "Criaturas do meu cenário"
  }
}
```

- **id:** nome da pasta do cenário.
- **nome:** nome do cenário, para exibição.
- **descricao:** uma frase, pro adulto.
- **privado:** `true` quando o conteúdo não pode ser publicado nem distribuído.
- **foundry:** dados do módulo de compêndio do Foundry gerado para o cenário: `modulo` (id do módulo), `titulo`, `pack` (nome do compêndio) e `rotulo` (nome do compêndio na tela).

## `cenarios/<id>/criaturas.json`

```json
[
  {
    "id": 1,
    "nome": "Faiscote",
    "tipos": ["eletrico"],
    "descricao": "Criatura de tipo Elétrico.",
    "imagem": "imagens/001.png",
    "vida": 7,
    "status": "rascunho",
    "atributos": {
      "forca":     { "base": 2, "slots": 2 },
      "energia":   { "base": 2, "slots": 2 },
      "agilidade": { "base": 3, "slots": 2 },
      "defesa":    { "base": 1, "slots": 2 }
    },
    "golpes": [
      { "nome": "Faísca", "icone": "raio", "tipo": "eletrico", "categoria": "elemental", "dado": "d4", "usos": null, "liberado_em": 1 },
      { "nome": "Raio Forte", "icone": "raio", "tipo": "eletrico", "categoria": "elemental", "dado": "d4", "usos": null, "liberado_em": 8 },
      { "nome": "Chute Forte", "icone": "bolinha", "tipo": "normal", "categoria": "fisico", "dado": "d4", "usos": null, "liberado_em": 22 },
      { "nome": "Cabeçada", "icone": "bolinha", "tipo": "normal", "categoria": "fisico", "dado": "d4", "usos": null, "liberado_em": 50 }
    ],
    "trilho": [
      { "pos": 1, "tipo": "habilidade", "detalhe": "Faísca" },
      { "pos": 8, "tipo": "habilidade", "detalhe": "Raio Forte" },
      { "pos": 12, "tipo": "coracao" },
      { "pos": 22, "tipo": "habilidade", "detalhe": "Chute Forte" },
      { "pos": 31, "tipo": "forca" },
      { "pos": 39, "tipo": "evolucao", "detalhe": "Faiscão" },
      { "pos": 43, "tipo": "poder", "detalhe": "Chute Forte" },
      { "pos": 50, "tipo": "habilidade", "detalhe": "Cabeçada" }
    ],
    "xp": 2,
    "inicio": 1,
    "evolucao": [{ "para": "Faiscão", "pos": 39, "requisito": "pedra-trovao" }],
    "resistencias": { "terra": "vulneravel", "eletrico": "resistente", "voador": "resistente" }
  }
]
```

(O exemplo acima é uma criatura fictícia e um recorte: o trilho real tem 70 posições e as demais marcas. Os valores reais vêm do `criaturas.json` de cada cenário.)

### Campos

- **id:** número da criatura. Cada espécie é uma carta. Evoluções são cartas próprias, com número próprio (ex.: as três formas de uma linha são três números seguidos).
- **nome:** nome em português, como o cenário define. Pode ter símbolo ou pontuação (ex.: "♀", "♂", "Sr.").
- **tipos:** lista de tipos da criatura. Os valores vêm da lista do cenário (`cenarios/<id>/tipos.json`).
- **descricao:** uma frase, pro adulto. Não vai na carta.
- **imagem:** caminho da imagem, relativo à pasta do cenário (ex.: `"imagens/001.png"`, em `cenarios/<id>/imagens/`).
- **escala_imagem:** opcional. Número de 1 a 1,18. Amplia a arte na carta sem alterar o PNG. Sem o campo, vale 1. Ver `docs/design-system.md`, seção 6.8.
- **raro:** opcional. `true` nas espécies raras (lendárias, únicas). É o que marca a espécie como rara para as regras de raro (orçamento em `docs/golpes-catalogo.md`, slots em `docs/regras-geracao-trilhas.md`). Sem o campo, a espécie não é rara.
- **vida:** corações iniciais da carta. Corações do trilho somam +1 cada quando a criança marca. Formas evoluídas têm no mínimo +1 em relação à forma anterior.
- **status:** `"rascunho"` ou `"aprovado"`.
- **atributos:** para cada um dos 4 atributos (`forca`, `energia`, `agilidade`, `defesa`), `base` (0 a 3) e `slots` (2 a 5, igual pros 4 atributos da espécie). **Gravado só na forma base e nas espécies sem evolução. Nulo nas formas com evolução anterior**, que herdam (ver `herda_atributos`).
  - `forca` = físico (soma em golpes físicos); `energia` = elemental (soma em golpes elementais); `agilidade` = esquiva; `defesa` = redução de dano. O valor da base sai do critério por arquétipo de tipo e identidade, descrito no `RESUMO-DADOS.md` do cenário, quando houver. Base negativa não existe: mínimo 0.
- **herda_atributos:** `true` nas formas com evolução anterior. O runtime copia o valor atual de cada atributo da forma anterior (base + estrelas), sem +1 de evolução (ver `docs/especificacao.md`, seção 14). Formas base não têm o campo.
- **golpes:** lista de exatamente 4, na ordem de liberação.
  - `nome`: nome do golpe em português.
  - `icone`: nome do ícone (ver `tipos.json`, ex.: `raio`, `folha`, `gota`, `bolinha`).
  - `tipo`: tipo elemental do golpe (ex.: `eletrico`, `planta`, `normal`).
  - `categoria`: `fisico` (usa Força) ou `elemental` (usa Energia).
  - `dado`: `"d4"`, `"d6"` ou `"d8"`. Só esses três. Não existe `dano`.
  - `usos`: `null` (ilimitado) ou `2` / `3` (bolinhas).
  - `liberado_em`: posição da marca `habilidade` de mesmo número (golpe 1 = habilidade na casa 1; golpe 2 = 2ª habilidade; e assim por diante). O card mostra quadrado vazio pra "ainda não liberado" e marcado pra "liberado".
- **trilho:** lista de marcas ordenada por `pos`. Tem sempre 70 posições (1 a 70), sem posição repetida (exceto marcos de pedra/troca na posição 40, que podem coincidir). Cada marca tem `pos`, `tipo` e, quando aplicável, `detalhe`.
  - `estrela`: +1 em um atributo à escolha. Quantidade = 4 × slots da forma.
  - `coracao`: +1 de vida. 3 por carta.
  - `forca`: +1 de Força automático. 2 por carta.
  - `habilidade`: libera um golpe. 4 por carta. A 1ª fica sempre na casa 1 e libera o golpe 1. A 2ª, 3ª e 4ª liberam os golpes 2, 3 e 4, em faixas diferentes: 2ª entre as casas 3 e 16, 3ª entre 18 e 33, 4ª entre 36 e 50. `detalhe` = nome do golpe liberado.
  - `poder`: +1 no resultado do dado de um golpe já liberado. 2 por carta, sempre no terço final (pos 34–50). `detalhe` = nome do golpe.
  - `evolucao`: marco que permite evoluir, no terço final (pos 34–50). `detalhe` = nome da próxima forma. Quantidade = número de evoluções.
  - O trilho de cada carta começa vazio. Nenhum progresso é transferido da forma anterior.
- **xp:** inteiro de 1 a 5. Quadradinhos que a espécie dá quando derrotada.
- **inicio:** sempre `1`. Mantido por compatibilidade. A carta começa na casa 1 em todas as formas.
- **evolucao:** lista, opcional. Só nas espécies que evoluem. Cada entrada tem:
  - `para`: nome da próxima forma.
  - `pos`: posição da marca `evolucao` no trilho desta forma.
  - `requisito`: opcional. Item (`pedra-trovao`, `pedra-fogo`, `pedra-agua`, `pedra-folha`, `pedra-lua`) ou `troca`. Sem campo quando a evolução é por nível.
- **resistencias:** mapa tipo → `"resistente"` | `"imune"` | `"vulneravel"`, com uma entrada por tipo que modifica dano. Tipo sem modificador não aparece. Ordem das chaves: vulneráveis primeiro, depois imunes, depois resistentes (a carta mostra só as três primeiras). Não existe campo `vulnerabilidades`.
  - `resistente`: dano dividido por 2, arredondado pra cima.
  - `imune`: dano zero.
  - `vulneravel`: dano ×2.

## `cenarios/<id>/tipos.json`

Lista de tipos do cenário com `id`, `nome` e `icone`, mais `fisico` (usado só como ícone de categoria, não é tipo de espécie). Hoje o site e o Foundry conhecem 15 tipos (normal, fogo, água, elétrico, planta, gelo, lutador, veneno, terra, voador, psíquico, inseto, pedra, fantasma e dragão) mais `fisico`.


## Tamanho (2026-10-05)

- `altura_m`: altura de referência da criatura, em metros (dado do cenário).
- `tamanho`: `pequeno` (< 0,5 m, token 0,5 × 0,5), `medio` (0,5 a 1,4 m, token 1 × 1), `grande` (≥ 1,5 m, token 2 × 2).
