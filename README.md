# Kindlewild

A tabletop RPG with cards for young children, who can't read well yet, to play together with an adult. Each child looks after a creature: it earns experience on a track of boxes, unlocks moves, colors in stars on its attributes and evolves by switching cards.

The game was made to create three feelings: **"this creature is mine"**, **"it is getting stronger"** and **"I just got something new"**.

**Page:** https://alanleite.github.io/kindlewild/ (example cards to view and print)

> Work in progress. The rules are still being calibrated in playtest, and the example scenario has only 4 placeholder creatures, with no art.

## How it works

- **A6 card, front and back**, printed 4 per A4 sheet. On the front: name, art, types, health in hearts, attributes and 4 moves. On the back: the experience track, to mark with a pencil.
- **Almost no text:** only the creature name and the move names. Everything else is icon, color or box, and the adult reads out loud.
- **Simple combat:** d10 to hit (against the target's Agility), d4/d6/d8/d12 damage plus Strength or Energy, minus Defense.
- **Growing is visible:** each box crossed out on the track can unlock a move, give a star, an extra heart or the evolution milestone.

Full rules in [`docs/rules.md`](docs/rules.md); moves in [`docs/moves.md`](docs/moves.md). The project started in Portuguese: [`docs/glossary.md`](docs/glossary.md) maps the old Portuguese terms, fields and file names to the English ones.

## Core and scenarios

The **core** is the game: rules, cards, simulator and the Foundry VTT system. A **scenario** is the world being played: which creatures exist, their moves, their art and the map (`scenarios/<id>/`). The same core works for any scenario. Data format in [`docs/schema.md`](docs/schema.md).

## Running locally

Needs Node 24.

```sh
npm install
npm test                         # simulator, site and move validation
npx serve .                      # or: python3 -m http.server — then open /site/
npm run build                    # print PDFs in scenarios/<id>/print/
node sim/run.js 1 3              # simulates battles between creatures 1 and 3
```

Foundry VTT v14: see [`foundry/README.md`](foundry/README.md).

## Structure

| Folder | What |
|-------|-------|
| `docs/` | Rules, moves, track generation, design system, data format and glossary |
| `scenarios/` | Scenarios (today, `example`) and the default scenario (`default.txt`) |
| `site/` | Cards and printing in the browser (plain HTML, CSS and JS) |
| `sim/` | Combat simulator to calibrate the rules |
| `scripts/` | Print PDFs and validators |
| `foundry/` | `kindlewild` system for Foundry VTT |
| `page/` | GitHub Pages home page |
