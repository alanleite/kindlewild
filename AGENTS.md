# Kindlewild: children's creature RPG

Card RPG for young children to play with an adult: creatures with an XP track, attributes, moves and evolution. The rules are in `docs/rules.md` (source of truth) and the data format in `docs/schema.md`. The project started in Portuguese; `docs/glossary.md` is the Portuguese→English reference for terms, data fields and file names.

**This repository is public** (github.com/alanleite/kindlewild, with a GitHub Pages page).

## Core and scenarios

- **Core** (everything outside `scenarios/`): rules, simulator, site, PDFs and the Foundry system. It cannot have third-party content: no names, characters, places, moves or art from other franchises, and no hardcoded scenario ids in the code. Anything specific to a scenario becomes a field in the data (e.g.: `rare`, `image_scale`).
- **Scenarios** (`scenarios/<id>/`): `scenario.json` (manifest), `creatures.json`, `types.json`, `images/`. Only scenarios with `"private": false` go into git (today, `example`). The default is in `scenarios/default.txt` or in `KINDLEWILD_SCENARIO`.
- **Private scenarios** may be linked into `scenarios/` with a symlink. Git ignores them. Never copy anything from them outside their own folder, don't change `.gitignore` to include them and don't use their data as examples in code, tests or docs.

## Publication guard

`npm run check` (`scripts/check-publication.js`) blocks third-party terms (by comparing hashes; the readable list lives outside the repository), images outside `scenarios/<id>/images/` and files from private scenarios. It runs in this machine's pre-commit and in GitHub CI. If it complains, fix the content; don't bypass the guard.

## Structure

| Folder | What |
|-------|-------|
| `docs/` | Rules, move catalog, track generation, design system, `schema.md` and `glossary.md` |
| `lib/scenario.js` | Finds and loads the scenario (simulator, scripts and Foundry) |
| `site/` | Cards and printing (plain HTML, CSS and JS; `?scenario=<id>`) |
| `page/` | GitHub Pages home page |
| `sim/` | Combat simulator to calibrate the rules |
| `scripts/` | Print PDFs (`npm run build`), validators (`npm run check:alignment`, `npm run check:moves`) and the guard |
| `foundry/` | `kindlewild` system for Foundry VTT; each scenario becomes a module |

Tests: `npm test` at the root and in `foundry/`. Node comes from nvm on this machine (`source ~/.nvm/nvm.sh`).
