# Card design system (v0.5)

Tokens used in `site/style.css`. Measurements in mm, because the card is printed in A6 (105 × 148.5 mm). In the CSS, the `--u` unit is 1 mm of the card.

Changes in this version (author's feedback, round 3):
- Move: 1 cm icon as the focus, small name, die in text notation (`d4`, `d6`, `d8`) and "+" with the attribute icon.
- Health: 7 mm hearts, 8 per row, up to 2 rows.
- Resistances: leave their row and go to the bottom right corner of the image, at half the size.
- Moves: shorter block (41.2 mm, was 48.1 mm).

Decisions closed later in the round:
- 6.1 mm between the main blocks of the front.
- Maximum health of 24 hearts, including hearts unlocked along the track.
- Move name smaller than the previous version (4.2 mm): now **3.6 mm (~10 pt)**, in up to 2 lines. Author's decision; it overrides the 14 pt minimum of section 11 of the rules.
- Space between the blocks of the front: **6.1 mm** in all three gaps (image → health, health → attributes, attributes → moves). To fit, the attribute boxes went from 3.6 to **2.6 mm**. The hearts were reduced from 10 to 7 mm (author's request), which freed space for the 6.1 mm gap.

## 1. Colors

### Type colors (one per type, used in the type disc and the soft background)

| Type | Token | Hex |
|---|---|---|
| Electric | `--type-electric` | #f7c600 |
| Fire | `--type-fire` | #f0622a |
| Water | `--type-water` | #3b8ee6 |
| Plant | `--type-plant` | #3ea650 |
| Earth | `--type-earth` | #b98b52 |
| Ice | `--type-ice` | #7fd8ea |
| Air | `--type-air` | #9bb8ef |
| Poison | `--type-poison` | #9a4fc4 |
| Psychic | `--type-psychic` | #e95b9a |
| Stone | `--type-stone` | #a9a17e |
| Normal | `--type-normal` | #c4c4b4 |
| Fighter | `--type-fighter` | #c8553d |
| Insect | `--type-insect` | #9bc23c |
| Ghost | `--type-ghost` | #6f5ea8 |
| Dragon | `--type-dragon` | #5b4fd8 |

The icons inside the discs are always in the ink color (`--color-line`), to read well on any type color. In black-and-white printing, the shape of the icon tells the type.

### Track mark colors

| Mark | Token | Use |
|---|---|---|
| Skill | `--mark-skill` | light blue |
| Star | `--mark-star` | yellow |
| Heart | `--mark-heart` | light red |
| Strength | `--mark-strength` | light orange |
| Power | `--mark-power` | light purple |
| Evolution | `--mark-evolution` | light green |

### System colors

`--color-sheet` (white card background), `--color-line` (ink: outlines and icons), `--color-line-soft` (secondary outline), `--color-text`, `--color-text-soft`, `--color-heart`, `--color-accent` (symbol of the effect chips).

There is no gray in the card states. The old "locked" state color was removed and no longer exists in the CSS.

Dark mode: redefines only the screen tokens. Printing forces the light block at the end of `style.css`.

## 2. Spacing scale

Multiples of 1 mm. Each token is `calc(var(--u) * n)` on the card.

| Token | mm | Use |
|---|---|---|
| `--space-1` | 1 | separation within rows (attribute columns, types) |
| `--space-2` | 2 | inner padding of rows, name strip |
| `--space-4` | 4 | inner margin of the card (sides) |

Space between the blocks of the front: **6.1 mm**. Inside the blocks: moves are contiguous, 0.5 mm between hearts in the same row, 1 mm between rows of hearts, 1 mm between type discs, 0.6 mm between attribute boxes and 2 mm between the attribute icon and its boxes.

## 3. Typography

| Role | Size | Weight |
|---|---|---|
| Creature name | 5.4 mm (~15 pt) | 800 |
| Move name | 3.6 mm (~10 pt), up to 2 lines | 700 |
| Legend text (screen, for the adult) | 4 mm (~11 pt) when the legend is printed | 400 |

The creature name keeps at least 14 pt. The author decided that the move name must be smaller than 4.2 mm: now 3.6 mm (~10 pt), in up to 2 lines. Besides the names, only the short dice notation (`d4`, `d6`, `d8`) appears as text on the card.

## 4. Icon and target sizes

| Element | Size | Side | Reason |
|---|---|---|---|
| Type disc (with icon) | 6.4 mm | name bar | up to 2, in the left corner |
| Heart | 6.2 mm | front | 12 per row; outlined hearts are future track rewards |
| Move unlock square | 10 mm | front | pen target (1 cm) |
| Move icon | 10 mm | front | 1 cm icon, focus of the row |
| Attribute icon (on the move and in the column) | 8 mm | front | same size in both places |
| Die (`d4`, `d6` or `d8`) | 8 mm column | front | bold text inside the move row |
| "+" between die and attribute | 3 mm | front | symbol, not a target |
| Resistance chip (type disc) | 5.75 mm | over the image | about 15% bigger than the previous version |
| Effect symbol on the chip | 2.4 mm | over the image | half the previous size (4.6 mm) |
| Attribute box | 2.6 mm | front | pen target, reduced to fit the 4 mm space; see section 7 |
| Use dot | 3.4 mm | front | pen target; see section 7 |
| Track box | 10 mm | back | pen target (1 cm) |
| Mark inside the box | 6.5 mm | back | mark icon, same size as the move's area icon |

General rule: an icon the child reads by eye is at least 8 mm. A pen target is 1 cm whenever it fits. The resistance chip and symbol are not marked, so they stay below 1 cm (author's request: half the size).

## 5. States

| State | How it looks | Where |
|---|---|---|
| **Colored** | box filled with ink, or track box with the mark's color | attributes, track |
| **Empty** | thin outline, white background | boxes, track boxes, move not unlocked |
| **Marked** | square with a stroke inside | unlocked move |
| **Spent** | dot with an X | move dots already used (only in the legend; the printed card doesn't mark uses) |
| **Next** | double border | track box at `start` |

A state never depends on color alone: each state has a shape (filled, empty, stroke, X, double border).

Move not unlocked: empty square, without the type's background color. No padlock and no gray.

## 6. Decisions

### 6.1 Resistances (chips)

Field `resistances` (see `docs/schema.md`). Up to three resistant types are shown on the left (½), and up to three vulnerable types on the right (×2), with 8 mm colored type discs. Moves use the same type icons and colors. Unlisted types are neutral and there are no immunities.

They sit in the **bottom right corner of the image**, over the art, and don't take a row of their own. There is no "more" symbol: the full list is on the legend sheet (`legend.html`).

### 6.2 Track on the back

The 70-box track is **on the back**, 7 columns by 10 rows, 10 mm boxes, 4 mm between boxes. It takes 94 × 136 mm, centered. In the browser print layout, a small creature name in the bottom margin identifies the back without moving the track.

Mirrored back: the front and back sheets are separate. With long-edge printing, the back of slot 0 is the card of slot 1, and so on (`mirrorBack` in `site/print-selection.js`).

### 6.3 Selection for printing

Before the sheets, the screen shows a searchable list with the scenario's creatures (151 in the test scenario). All start checked; the user can clear the selection, search by name or number and check only the cards they want. The preview is rebuilt automatically in creature number order, in groups of four. An incomplete group keeps the empty slots, and the back mirrors those empty ones too so it stays aligned with the front. The selection panel doesn't show on paper.

Track generation rules (fixed per species), derived from section 4 of the rules:

- 70 positions. The distribution follows `docs/track-generation.md`.
- Skills, upgrades and evolution are read directly from each species' track.
- No repeated position.

The site checks these rules on every card and shows the warning in the header. In this round, the test scenario's `creatures.json` passes all of them.

### 6.4 Move dice

Only d4, d6 and d8 (rules, section 2). The die appears in direct text notation — `d4`, `d6` or `d8` — in bold. No other value gets a label; the site warns in the console.

### 6.5 Stage

The card shows the stage with 1 to 3 dots in the bottom left corner of the image, with no text. The stage comes from the evolution chain present in the species list.

### 6.6 Attributes of an evolved form

`attributes: null` and `inherits_attributes: true` on evolved forms. The boxes come out **empty**: copy the inherited value on evolution. Their count leaves room for the possible inherited values and the new form's growth. Base forms use the colored base.

The boxes show each species' profile from `attributes.base` and `attributes.slots`. The layout doesn't assume equal values between species. If each species' attributes look standardized, that comes from the data, not from the layout.

### 6.7 Move: icon, name, die and sum

Each move is a 10 mm row, in this order:

1. Unlock square (10 mm; empty or marked).
2. Move icon (10 mm, focus of the row).
3. Name (3.6 mm, up to 2 lines).
4. Die: text `d4`, `d6` or `d8` in an 8 mm column.
5. "+" (3 mm) and attribute icon (10 mm): **Strength** if `category` is `physical`, **Energy** if it is `elemental`.
6. Use dots (only on moves with `uses`; fixed width of 12 mm to align the rows).

### 6.8 Image

The image box is 46.9 mm. In the test scenario, all 151 PNGs are 475 px with a 22 px margin, and the largest visible dimension is 431 px in all of them. So the visible height of the artwork is the same for every species.

The visible **area** changes with the drawing: from 1.9% of the card (the thinnest silhouette) to 9.0% (the fullest). It isn't margin: it is the shape of the silhouette that changes. Trimming (cutting the margin) changes nothing in the measurements.

The site normalizes the perceived size with each creature's optional `image_scale` field in `creatures.json` (default 1), read by `site/image-scale.js`. The scenario picks reference art, which stays at scale 1 (in the test scenario, the first evolution line, numbers 1 to 3). Art with an area below the reference's final form gets a factor calculated from the square root of the ratio between areas, rounded to two decimal places. Only factors from 1.05 up are used and the ceiling is 1.18, to enlarge small silhouettes without noticeable cropping. The original PNGs are not modified; the factor is applied only in the card layout.

### 6.9 Health

Up to 24 hearts, in 2 rows of 12 (6.2 mm each). Starting hearts are filled; future hearts from the track are outlined. The health row stays 15 mm high, keeping the cards aligned.

## 7. Front and back measurements

The card is 105 × 148.5 mm. Front, top to bottom:

| Block | Height (mm) |
|---|---|
| Top: image (with the name strip on top; resistances in the bottom right corner) | 59.4 (40%) |
| Space between blocks (6.1 mm) | 6.1 |
| Health row: centered hearts (2 rows of 8, 7 mm each, 1 mm between rows) | 15 |
| Space between blocks (6.1 mm) | 6.1 |
| Attributes (icon 8 + breathing room 2 + boxes 2.6) | 12.6 |
| Space between blocks (6.1 mm) | 6.1 |
| Moves: 4 contiguous rows of 10 | 40 |
| Bottom margin of the body | 3 |
| **Total** | **148.3** |

Gaps image → health, health → attributes and attributes → moves = 6.1 mm each (was 4 mm). The smaller hearts (7 mm) and the 15 mm health row freed the space, redistributed across the three gaps so the card doesn't have leftover space at the bottom. The four move rows stay contiguous, and each attribute icon has 2 mm of breathing room before the boxes. The side margin of the body is 3 mm; the bottom one too. Not re-measured in the browser after this change.

## 8. References (what was used)

Research done from search summaries (I didn't read the full pages). The points below are the ones that showed up consistently in the summaries:

1. **Collectible card anatomy** (mintvandal.com/guides/card-anatomy). Used: name at the top, art in the center, type symbol always in the same corner, moves in the middle, footer information.
2. **"How to Design Professional Looking Trading Cards" (2026) and "How To Design Top Level Trading Cards"** (tradingcardprinting.com). Used: a consistent frame that ties the whole collection together, and "leave breathing room around the picture". Adopted: neutral cut line and a white bar for the name.
3. **"Trading Card Design Tips: 3 lessons from MTG's success"** (qpmarketnetwork.com). Used: limit to 2 or 3 main colors and use shape and position for hierarchy, not just color. Adopted: type disc with a distinct shape per type, and states with shape.
4. **"How to Make Trading Cards: Design to Print"** (4over4.com/guide/how-to-make-trading-cards). Used: safe zone for the content, away from the cut edges.

## 9. Files

- `docs/design-system.md` (this file)
- `site/style.css`: tokens in `:root`, front and back, legend and print block
- `site/app.js`: builds the front (types in the bar, health row, chips over the image, move with text die and sum), the back and the sheets, validation of each card
- `site/card-view.js`: pure rules for presenting the types in the header and the text notation of the dice
- `site/image-scale.js`: reads each creature's optional `image_scale` field (default 1) and applies the enlargement on the card
- `site/icons.js`: icon map (types, moves, attributes, track, effects, "+" symbol, marked and legacy dice drawings)
- `site/legend.html` and `site/legend.js`: legend page for the adult (text allowed)
- `site/fixtures/example-creatures.json`: 3 test species (one base form, one evolved form and one rare)

## 9. Move row with effect, area and charges (2026-10-04)

Fixed columns inside the move box (mm): icon 10 | name (the rest) | die 9 | "+" 2.5 | attribute 8 | effect 7.5 | area 6.5 | charges 4. Charge dots of 2.6 mm stacked vertically (max. 3). Effect tokens: colored disc with a drawing (weakness gray/down arrow, poison purple/drop, paralysis yellow/bolt, sleep blue/Z, swift cyan/feather, shield orange/shield, extra strength red/up arrow, heal green/heart). Dice include `d12`.
