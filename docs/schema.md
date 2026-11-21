# Data schema

Game data lives in the scenario, in `scenarios/<id>/`. Single source of the cards: `scenarios/<id>/creatures.json` (one card per species). Types: `scenarios/<id>/types.json`. Images: `scenarios/<id>/images/`. Every field below is required, unless marked as optional.

All species are at `"status": "draft"`. Once approved, change it to `"approved"`.

## Scenario structure

```text
scenarios/
  default.txt         id of the default scenario (e.g.: example)
  <id>/
    scenario.json     scenario manifest
    creatures.json    list of creatures (this schema)
    types.json        list of the scenario's types
    images/           card art (NNN.png)
```

The default scenario comes from the environment variable `KINDLEWILD_SCENARIO` or, if it isn't set, from `scenarios/default.txt`.

A scenario can have other folders of its own (maps, printing, calibration proposals, Foundry module). They are not part of the core.

### `scenario.json`

```json
{
  "id": "my-scenario",
  "name": "My scenario",
  "description": "One sentence about the scenario.",
  "private": false,
  "foundry": {
    "module": "kindlewild-my-scenario",
    "title": "Kindlewild: My scenario",
    "pack": "creatures",
    "label": "My scenario's creatures"
  }
}
```

- **id:** name of the scenario folder.
- **name:** scenario name, for display.
- **description:** one sentence, for the adult.
- **private:** `true` when the content can't be published or distributed.
- **foundry:** data for the Foundry compendium module generated for the scenario: `module` (module id), `title`, `pack` (compendium name) and `label` (compendium name shown on screen).

## `scenarios/<id>/creatures.json`

```json
[
  {
    "id": 1,
    "name": "Faiscote",
    "types": ["electric"],
    "description": "Electric-type creature.",
    "image": "images/001.png",
    "health": 7,
    "status": "draft",
    "attributes": {
      "strength": { "base": 2, "slots": 2 },
      "energy":   { "base": 2, "slots": 2 },
      "agility":  { "base": 3, "slots": 2 },
      "defense":  { "base": 1, "slots": 2 }
    },
    "moves": [
      { "name": "Faísca", "icon": "bolt", "type": "electric", "category": "elemental", "die": "d4", "uses": null, "unlocked_at": 1 },
      { "name": "Raio Forte", "icon": "bolt", "type": "electric", "category": "elemental", "die": "d4", "uses": null, "unlocked_at": 8 },
      { "name": "Chute Forte", "icon": "dot", "type": "normal", "category": "physical", "die": "d4", "uses": null, "unlocked_at": 22 },
      { "name": "Cabeçada", "icon": "dot", "type": "normal", "category": "physical", "die": "d4", "uses": null, "unlocked_at": 50 }
    ],
    "track": [
      { "pos": 1, "kind": "skill", "detail": "Faísca" },
      { "pos": 8, "kind": "skill", "detail": "Raio Forte" },
      { "pos": 12, "kind": "heart" },
      { "pos": 22, "kind": "skill", "detail": "Chute Forte" },
      { "pos": 31, "kind": "strength" },
      { "pos": 39, "kind": "evolution", "detail": "Faiscão" },
      { "pos": 43, "kind": "power", "detail": "Chute Forte" },
      { "pos": 50, "kind": "skill", "detail": "Cabeçada" }
    ],
    "xp": 2,
    "start": 1,
    "evolutions": [{ "into": "Faiscão", "pos": 39, "requires": "spark-crystal" }],
    "resistances": { "earth": "vulnerable", "electric": "resistant", "air": "resistant" }
  }
]
```

(The example above is a fictional creature and an excerpt: the real track has 70 positions and the other marks. The real values come from each scenario's `creatures.json`.)

### Fields

- **id:** creature number. Each species is a card. Evolutions are cards of their own, with their own number (e.g.: the three forms of a line are three consecutive numbers).
- **name:** name in the scenario's language, as the scenario defines it. It can have symbols or punctuation (e.g.: "♀", "♂", "Mr.").
- **types:** list of the creature's types. The values come from the scenario's list (`scenarios/<id>/types.json`).
- **description:** one sentence, for the adult. Not printed on the card.
- **image:** image path, relative to the scenario folder (e.g.: `"images/001.png"`, in `scenarios/<id>/images/`).
- **image_scale:** optional. Number from 1 to 1.18. Enlarges the art on the card without changing the PNG. Without the field, it is 1. See `docs/design-system.md`, section 6.8.
- **rare:** optional. `true` on rare species (legendary, unique). It is what marks the species as rare for the rare rules (budget in `docs/moves.md`, slots in `docs/track-generation.md`). Without the field, the species is not rare.
- **health:** starting hearts of the card. Hearts on the track add +1 each when the child marks them. Evolved forms have at least +1 compared to the previous form.
- **status:** `"draft"` or `"approved"`.
- **attributes:** for each of the 4 attributes (`strength`, `energy`, `agility`, `defense`), `base` is the number of natural filled boxes and `slots` is the total including filled and empty boxes. The growth capacity is `slots - base`; natural boxes are added without removing previous growth boxes. **Stored only on the base form and on species with no evolution. Null on forms with a previous evolution**, which inherit (see `inherits_attributes`).
  - `strength` = physical (added to physical moves); `energy` = elemental (added to elemental moves); `agility` = dodge; `defense` = damage reduction. The base value comes from the criteria by type archetype and identity, described in the scenario's `RESUMO-DADOS.md`, when there is one. There is no negative base: minimum 0.
- **inherits_attributes:** `true` on forms with a previous evolution. The runtime copies the current value of each attribute from the previous form (base + stars), with no +1 for evolving (see `docs/rules.md`, section 14). Base forms don't have the field.
- **moves:** list of exactly 4, in unlock order.
  - `name`: move name in the scenario's language.
  - `icon`: icon name (see `types.json`, e.g.: `bolt`, `leaf`, `drop`, `dot`).
  - `type`: elemental type of the move (e.g.: `electric`, `plant`, `normal`).
  - `category`: `physical` (uses Strength) or `elemental` (uses Energy).
  - `die`: `"d4"`, `"d6"` or `"d8"`. Only these three. There is no `damage` field.
  - `uses`: `null` (unlimited) or `2` / `3` (dots).
  - `unlocked_at`: position of the `skill` mark with the same number (move 1 = skill on box 1; move 2 = 2nd skill; and so on). The card shows an empty square for "not unlocked yet" and a marked one for "unlocked".
- **track:** list of marks sorted by `pos`. It always has 70 positions (1 to 70), with no repeated position (except stone/trade milestones at position 40, which may coincide). Each mark has `pos`, `kind` and, when applicable, `detail`.
  - `star`: +1 to an attribute of the child's choice. Count = 4 × the form's slots.
  - `heart`: +1 health. 3 per card.
  - `strength`: automatic +1 Strength. 2 per card.
  - `skill`: unlocks a move. 4 per card. The 1st is always on box 1 and unlocks move 1. The 2nd, 3rd and 4th unlock moves 2, 3 and 4, in different ranges: 2nd between boxes 3 and 16, 3rd between 18 and 33, 4th between 36 and 50. `detail` = name of the unlocked move.
  - `power`: +1 to the die result of an already unlocked move. 2 per card, always in the last third (pos 34–50). `detail` = move name.
  - `evolution`: milestone that allows evolving, in the last third (pos 34–50). `detail` = name of the next form. Count = number of evolutions.
  - Each card's track starts empty. No progress is carried over from the previous form.
- **xp:** integer from 1 to 5. Boxes the species gives when defeated.
- **start:** always `1`. Kept for compatibility. The card starts on box 1 in every form.
- **evolutions:** list, optional. Only on species that evolve. Each entry has:
  - `into`: name of the next form.
  - `pos`: position of the `evolution` mark on this form's track.
  - `requires`: optional. An item id defined by the scenario (e.g. `water-stone`, `spark-crystal`) or `trade`. No field when the evolution is by level.
- **resistances:** map type → `"resistant"` | `"immune"` | `"vulnerable"`, with one entry per type that modifies damage. Types with no modifier don't appear. Key order: vulnerable first, then immune, then resistant (the card shows only the first three). There is no `vulnerabilities` field.
  - `resistant`: damage divided by 2, rounded up.
  - `immune`: zero damage.
  - `vulnerable`: damage ×2.

## `scenarios/<id>/types.json`

List of the scenario's types with `id`, `name` and `icon`, plus `physical` (used only as a category icon, not a species type). Today the site and Foundry know 15 types (normal, fire, water, electric, plant, ice, fighter, poison, earth, air, psychic, insect, stone, ghost and dragon) plus `physical`.


## Size (2026-10-05)

- `height_m`: the creature's reference height, in meters (scenario data).
- `size`: `small` (< 0.5 m, token 0.5 × 0.5), `medium` (0.5 to 1.4 m, token 1 × 1), `large` (≥ 1.5 m, token 2 × 2).
