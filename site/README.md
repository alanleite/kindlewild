# Kindlewild cards (printing site)

Static site that lets you pick the scenario's creatures and lays out their cards on A4 sheets. Each card is A6 (105 × 148.5 mm) and has a front and a back. One A4 portrait sheet holds 4 cards (2 × 2 grid). No framework and no build: `index.html`, `legend.html`, `style.css`, `app.js`, `card-view.js`, `print-selection.js`, `scenario-web.js`, `image-scale.js`, `legend.js` and `icons.js`.

Visual rules (tokens, icon sizes, states, decisions): `docs/design-system.md`. Game rules (track, attributes, resistances): `docs/rules.md`.

## How to run

The site reads the creatures of a scenario (`../scenarios/<id>/creatures.json`) with `fetch`. The scenario comes from `?scenario=<id>` or, without a parameter, from `scenarios/default.txt` (see `scenario-web.js`). Browsers block `fetch` when the file is opened straight from disk (`file://`), so the project folder has to be served. At the project root (`kindlewild/`):

```sh
python3 -m http.server
```

Then open:

- http://localhost:8000/site/ (cards)
- http://localhost:8000/site/legend.html (legend, for the adult)

If you open `index.html` with a double click, the page shows a message explaining this.

## Alternative data

On the cards page, enter a public HTTPS URL in **Creature database URL** and select **Load database**. The JSON must be an array of creatures in the format described in `docs/schema.md`. Each `image` can be an absolute HTTPS URL or a path relative to the JSON file. **Use example** returns to the default scenario.

The storage server must allow cross-origin requests from the site using CORS (for example, `Access-Control-Allow-Origin: https://alanleite.github.io`). Images must also be publicly accessible. The database URL appears in the browser address bar and history, so do not use passwords, API keys or secret signed URLs. The browser fetches the data directly; the site does not upload it to the repository.

To pick the scenario: http://localhost:8000/site/?scenario=example

To test with another file, pass `?data=` with a path relative to `site/` (images are looked up in that file's folder):

- http://localhost:8000/site/?data=fixtures/example-creatures.json

The fixture `fixtures/example-creatures.json` (new move format) has 4 fictional creatures, without images (the dashed circle shows up), and follows the rules (section 4 for the track):

- **Brotinho (1):** base form. d4 moves, attributes with a filled base.
- **Brotão (2):** evolved form. `attributes: null` and `inherits_attributes: true`, so the boxes come out empty.
- **Mentalix (3):** rare species, with 5 attribute slots, health 16, d12, area, support and a move icon that does not exist (tests the placeholder).
- **Mutalu (4):** evolves with a stone, mark at position 40.

The fixture does not replace the scenario.

## How to print (front and back)

The card has a front and a back. Use **Choose creatures** to search and check only the cards you want. All start selected; **Clear selection** lets you start from scratch. Each group of 4 selected cards produces **two consecutive sheets**: the front sheet and the back sheet. They are printed one after the other and must end up on the same paper, one on each side.

1. Click **Print selected** (or Ctrl/Cmd + P).
2. Paper: **A4**, orientation **portrait**. Margins: **none**. Scale: **100%**.
3. Uncheck **Headers and footers** (the browser prints date, title and URL by default).
4. Check **Background graphics** (or "Print background colors and images"), so the type colors and the marks come out.
5. In **Two-sided** (or "Print on both sides"), choose **flip on long edge** (left or right side, like a book). Do not choose the short edge: the back would come out upside down.
6. Cut along the light lines of each card.

The back of each sheet already comes out with mirrored columns. This way, each back sits behind the right front card when the sheet is flipped on the long edge.

If the printer does not do automatic two-sided printing, odd pages are the fronts and even pages are the backs. Print only the odd ones first. Put the sheets back in the tray and print only the even ones, flipping on the long edge. The position and order of reinsertion vary by printer; first do a test with a single sheet (pages 1 and 2) before printing the whole set.

The CSS uses `@page { size: A4 portrait; margin: 0 }` and a page break after each sheet.

## Controls

- **Choose creatures:** search by name or number and include or remove each creature from printing. The preview is reordered automatically by number.
- **Select all / Clear selection:** changes all checkboxes at once. With no card selected, the print button is disabled.
- **Sheet:** jumps to the chosen sheet (the front one).
- **Unlocked skills:** how many moves are already unlocked. The default is 1 (the first move comes unlocked). Moves beyond this number come out with an empty square.
- **Track warning:** shows up in the header when some card breaks a rule (track, moves, dice or evolution line profile). The details are in the warning's `title` and in the console.

## How the card reads the data

Each field of `creatures.json` is described in `docs/schema.md`. Points the site decides on its own:

- **Text:** the front has the creature name, the move names and the die notation (`d4`, `d6`, `d8`, `d12`). The back has a small creature name in the bottom margin for identification. Everything else is an icon, a color or a box.
- **Image:** `image` is relative to the folder of the data file (in the scenario: `images/025.png`). If the file does not exist, a dashed circle shows up. The image area (name band included) takes 40% of the card height: 59.4 mm. The creature's optional `image_scale` field (read by `image-scale.js`, capped at 1.18) conservatively enlarges visually small silhouettes, without changing the PNGs (see `docs/design-system.md`, section 6.8).
- **Stage:** 1 to 3 dots in the bottom left corner of the image, from the evolution chain of the list.
- **Types:** a small disc per type, with an icon, at the left end of the white name bar. The color is concentrated in the discs and in the soft background of the image; the card edges are neutral so they do not interfere with cutting.
- **Health:** one 1 cm heart per point (pen touch area), 8 per row, up to 2 rows. The data cap is 16, exactly what fits on the card.
- **Resistances:** `resistances` field, with values `vulnerable`, `immune` and `resistant`. The card shows up to 3 chips in the bottom right corner of the image, vulnerable first, then immune and then resistant. The full chart is in `legend.html`.
- **Attributes:** one column per attribute, with an icon and one box per slot. Base form: `base` fills the boxes. Evolved form (`attributes: null`): the boxes come out empty, because the value is inherited. The slots of that form come from the stage (base 2, middle 3, last 4, no evolution 4), because the data has no number. A negative base becomes 0.
- **Moves:** format `{ name, icon, element, attribute, die, charges, effect, area, weight, unlocked_at }` (see `docs/moves.md`); the legacy format (`type`/`category`/`uses`) is still accepted. Each row: unlock square, move icon (dashed placeholder if it is not in the map), name, die (`d4`, `d6`, `d8`, `d12`), "+" and the Strength or Energy icon, effect token (8 effects, in `icons.js`, group `effect`), area icon (several targets) and charge dots (3, 2 or 1; unlimited without dots). Support (`die: null`) shows only the effect. The element sets the background color.
- **Track (back):** 70 boxes, in 7 columns by 10 rows, each 10 mm. The **next** box has a double border and is the `start` position.

### Rule warnings

The header shows how many cards break a rule, and the warning's `title` lists the reasons. The reasons checked are: track (section 4 of the rules), moves and dice, profile equal to the previous form's and health above what fits on the card. The site does not rewrite the data.

## Icons

All icons live in `icons.js`, in a map by group: `type`, `move`, `attribute`, `track`, `effect`, `die`, `symbol`, `general`. Each entry is a simple stroke SVG (24 × 24, color = `currentColor`). To swap an icon, replace the key's SVG.

A key without a drawing in the map shows the **placeholder**: a dashed rounded square. This way the card never shows text in place of an icon.

## Validation

```sh
node site/validation.js
node --test site/tests/*.test.js
```

Checks the image scale, the print selection logic and the card view: dice in valid text notation and up to two types in the header. The tests in `tests/` check the icon map.
