# Glossary (Portuguese → English)

The project started in Portuguese. Code, data fields and docs are in English now; creature and move **names** in a scenario stay in the scenario's language (they are printed on the cards). This table maps the old Portuguese terms to the English ones used everywhere.

## Game terms

| Português | English | Notes |
|---|---|---|
| criatura | creature | |
| espécie | species | |
| cenário | scenario | the content pack: creatures, types, art, map |
| núcleo | core | rules, site, simulator, Foundry system |
| carta | card | |
| frente / verso | front / back | |
| golpe | move | |
| trilho (de experiência) | track (XP track) | the 70 boxes on the back of the card |
| casa / quadradinho | box | one position on the track |
| marca | mark | something printed on a track box |
| habilidade (marca) | skill | unlocks the next move |
| estrela | star | +1 to an attribute of the child's choice |
| coração | heart | 1 heart = 1 point of health |
| poder | power | +1 to a move's die result |
| evolução | evolution | |
| vida | health | counted in hearts |
| atributo | attribute | |
| Força / Energia / Agilidade / Defesa | Strength / Energy / Agility / Defense | `strength`, `energy`, `agility`, `defense` |
| base / slots | base / slots | |
| herdar atributos | inherit attributes | |
| dado | die (plural: dice) | |
| cargas / usos | charges | limited uses of a move |
| efeito | effect | |
| peso / orçamento | weight / budget | move builder |
| área | area | hits every enemy |
| suporte | support | a move with no damage die |
| resistente / vulnerável / imune | resistant / vulnerable / immune | |
| tipo / elemento | type / element | |
| raro | rare | |
| tamanho: pequeno / médio / grande | size: small / medium / large | |
| captura | capture | |
| Centro de Cura | Healing Center | full heal and full charges |
| descanso | rest | |
| mestre / adulto | game master / adult | |
| rascunho / aprovado | draft / approved | |
| ficha | sheet | Foundry |
| compêndio | compendium | Foundry |

## Types (elements)

| Português | English (`id`) |
|---|---|
| normal | `normal` |
| fogo | `fire` |
| água | `water` |
| elétrico | `electric` |
| planta | `plant` |
| gelo | `ice` |
| lutador | `fighter` |
| veneno | `poison` |
| terra | `earth` |
| voador | `air` |
| psíquico | `psychic` |
| inseto | `insect` |
| pedra | `stone` |
| fantasma | `ghost` |
| dragão | `dragon` |
| físico (só ícone) | `physical` |

## Effects

| Português | English (`id`) |
|---|---|
| fraqueza | `weakness` |
| veneno | `poison` |
| paralisia | `paralysis` |
| sono | `sleep` |
| ligeiro | `swift` |
| escudo | `shield` |
| força extra | `extra_strength` |
| cura | `heal` |

## Data fields (`creatures.json`)

| Antes | Agora |
|---|---|
| `nome`, `tipos`, `descricao`, `imagem` | `name`, `types`, `description`, `image` |
| `vida`, `status`, `xp`, `inicio` | `health`, `status`, `xp`, `start` |
| `atributos.{forca,energia,agilidade,defesa}.{base,slots}` | `attributes.{strength,energy,agility,defense}.{base,slots}` |
| `herda_atributos` | `inherits_attributes` |
| `golpes[]`: `nome`, `icone`, `elemento`, `atributo`, `dado`, `cargas`, `efeito`, `area`, `peso`, `liberado_em` | `moves[]`: `name`, `icon`, `element`, `attribute`, `die`, `charges`, `effect`, `area`, `weight`, `unlocked_at` |
| `trilho[]`: `pos`, `tipo`, `detalhe` | `track[]`: `pos`, `kind`, `detail` |
| `evolucao[]`: `para`, `pos`, `requisito` | `evolutions[]`: `into`, `pos`, `requires` |
| `resistencias` | `resistances` |
| `altura_m`, `tamanho`, `raro`, `escala_imagem` | `height_m`, `size`, `rare`, `image_scale` |
| `cenario.json`: `nome`, `descricao`, `privado`, `foundry.{modulo,titulo,pack,rotulo}` | `scenario.json`: `name`, `description`, `private`, `foundry.{module,title,pack,label}` |
| `tipos.json`: `id`, `nome`, `icone` | `types.json`: `id`, `name`, `icon` |

Legacy move format (still accepted by the simulator and site): `tipo` → `type`, `categoria` (`fisico`/`elemental`) → `category` (`physical`/`elemental`), `usos` → `uses`.

## Icons (`icon` values)

| Português | English |
|---|---|
| bolinha | `dot` |
| chama | `flame` |
| gota | `drop` |
| raio | `bolt` |
| folha | `leaf` |
| floco | `snowflake` |
| gelo | `frost` |
| punho | `fist` |
| soco | `punch` |
| bolha | `bubbles` |
| montanha | `mountain` |
| terra | `soil` |
| asa | `wing` |
| olho | `eye` |
| ferrão | `stinger` |
| pedra | `stone` |
| rocha | `rock` |
| fantasma | `ghost` |
| dragão | `dragon` |
| garra | `claw` |
| veneno | `poison` |

## Files and commands

| Antes | Agora |
|---|---|
| `cenarios/`, `cenario.json`, `criaturas.json`, `tipos.json`, `imagens/`, `padrao.txt`, `impressao/`, `propostas/` | `scenarios/`, `scenario.json`, `creatures.json`, `types.json`, `images/`, `default.txt`, `print/`, `proposals/` |
| `KINDLEWILD_CENARIO` | `KINDLEWILD_SCENARIO` |
| `docs/especificacao.md`, `docs/golpes-catalogo.md`, `docs/regras-geracao-trilhas.md` | `docs/rules.md`, `docs/moves.md`, `docs/track-generation.md` |
| `npm run gerar` / `validar` / `checar` | `npm run build` / `check:alignment` / `check` |
