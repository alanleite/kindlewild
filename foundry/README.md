# Kindlewild: Foundry VTT v14 system

Card-style creature sheet and move rolls in the chat. The system ships no creatures: they come from a **per-scenario module** (e.g. `kindlewild-example`), built from `scenarios/<id>/`.

Version 0.4.0 adds natural attribute bases. Existing actors default to base 0; rebuilding a scenario module does not update actors already in a world. Back up the world and re-import or update those actors deliberately, preserving any player progress. Evolution inheritance remains a manual operation in Foundry.

## Commands (run inside `foundry/`)

- `npm install`: installs Foundry's compendium packer.
- `npm test`: tests the rules, converter, manifests and the default scenario's compendium.
- `npm run build [-- --scenario <id>]`: builds the scenario module in `scenarios/<id>/foundry/` (`module.json`, compendium and images) from `scenarios/<id>/creatures.json`. Without `--scenario`, uses `scenarios/default.txt`.
- `npm run deploy [-- --scenario <id>]`: copies the system to `systems/kindlewild` and the module to `modules/<module>` inside `$FOUNDRY_DATA` (default: `~/services/foundry/data/Data`), without touching an already installed compendium. `npm run deploy -- --packs` also replaces the compendium: only with the world closed.

On the first install, restart the Foundry server so it picks up the system and the module, and enable the scenario module in the world. After that, on each deploy, just reload the world (F5). Compendiums only update with the world closed.

## At the table

- Sheet (Card tab): click the hearts and the attribute boxes; the square next to a move unlocks it; click the move to roll.
- Track tab: click the box the creature has reached. Max health follows the hearts on the track.
- Healing Center: health and charges to max. Rest: recovers half of max health.
- Select a target (T key over the token) before rolling to see its Agility, Defense and resistance in the chat.
