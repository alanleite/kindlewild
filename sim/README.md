# Battle simulator

1-vs-1 combat between two cards, to compare species. Reads the scenario's creatures (`scenarios/<id>/creatures.json`; default in `scenarios/default.txt`, or `KINDLEWILD_SCENARIO=<id>`) and follows the rules in `docs/rules.md` (sections 6 and 15) and `docs/moves.md` (move pieces and effects). Does not change data or the rules.

## How to run

```bash
node sim/run.js 25 1
```

Output: one line per progress and per matchup, with each side's win rate, the draw rate and the average number of turns.

Examples:

```bash
node sim/run.js 25 1 --progress 10,35,70 --n 2000
node sim/run.js 25,26 1,2 --policy random --stars strength
node sim/run.js 25 1 --seed 777
node sim/run.js --list
node sim/run.js --help
```

Engine tests:

```bash
node sim/validation.js
```

## CLI parameters

| Option | Default | What it does |
|---|---|---|
| `A`, `B` (positional) | required | Card name (accents and case ignored) or creature number. Accepts a comma-separated list: everyone against everyone. |
| `--progress` | `10,35,70` | Track positions, from 0 to 70, comma-separated. Each value produces one line per matchup. |
| `--n` | `2000` | Battles per matchup and progress. |
| `--policy` | `default` | Move choice. `default`: highest expected value (damage + effect) among the available moves. `random`: picks at random among the available moves. |
| `--stars` | `even` | Star distribution. `even`: one at a time in Strength, Energy, Agility and Defense. `strength`: Strength and Energy first, then Agility and Defense. `agility`: Agility first, then the others. |
| `--seed` | `12345` | Seed. Same seed and same parameters give exactly the same result. Each matchup starts with the same seed, so matchups are comparable to each other. |
| `--list` | | Lists the scenario's creatures with their number. |

The project's batches use `N=2000`, progress 10, 25 and 50, default policy and default seed.

## Files

- `engine.js`: `battle(a, b, options)` runs the combat and returns `{ winner: 'a' | 'b' | null, reason: 'KO' | 'limit', turns, healthLeft, log }`. Also exports `resolveAttack`, `computeDamage`, `hitChance`, `applyEffect`, `effectiveAgility`, `createRng`.
- `card.js`: `buildCard(species, { progress, stars })` builds the combat card from the JSON. `findSpecies(ref)` resolves a name or number.
- `policy.js`: move policies (`default`, `random`) and star policies (`distributeStars`).
- `run.js`: CLI.
- `calibrate.js`: calibration (every species against the others of the same stage); writes `scenarios/<id>/proposals/calibration.json` (or `--out`).
- `validation.js`: engine tests (41 tests).
- `fixtures/species.json`: test species (new format, legacy format, health cap), independent of the scenario.

Programmatic use:

```js
const { findSpecies, buildCard } = require('./sim/card');
const { battle, createRng } = require('./sim/engine');

const a = buildCard(findSpecies('25'), { progress: 25 });
const b = buildCard(findSpecies('1'), { progress: 25 });
const r = battle(a, b, { seed: 12345 });   // changes neither a nor b
console.log(r.winner, r.turns);
```

`battle` copies the cards internally, so the same card can be used in thousands of battles.

## Move format

```json
{ "name", "icon", "element", "attribute": "strength|energy|null", "die": "d4|d6|d8|d12|null",
  "charges": null|3|2|1, "effect": null|"weakness|poison|paralysis|sleep|swift|shield|extra_strength|heal",
  "area": false, "weight", "unlocked_at": 1 }
```

During the transition the simulator also accepts the legacy format (`type`, `category` physical/elemental, `uses`) and converts it: `type` becomes `element`, `category` becomes `attribute` (strength/energy), `uses` becomes `charges`.

## What the simulator models

- Who starts: higher base Agility. Tie: drawn with the seed.
- One side's turn: Sleep (loses the turn, the token goes), then Paralysis (d10 from 1 to 4: does not attack), then the move, then Poison (loses 1 heart at the end of the turn, even if the turn was lost). Sides always alternate.
- Hit: d10. Hits if the result is greater than or equal to the target's effective Agility (base, +3 with Swift, cap 8). Agility 0 or 1 always hits.
- Damage: rolls the `die` (d4, d6, d8, d12) and adds the move's attribute (Strength or Energy), the track's Power and the token adjustments (Extra Strength +2, Weakness −2). Target's type effect by `element`: vulnerable ×2, resistant half rounded up, immune zero. Then subtracts the target's Defense. Negative becomes 0. Zero on a hit becomes 1. Immune is always 0.
- Charges: uses 1 per use, even on a miss. Exhausted cannot be chosen. Move 1 is always unlimited (the card ignores `charges` on move 1). If no move is available, the turn passes with no attack.
- Support move (`die` null): does not roll to hit. A positive effect goes to itself. A negative effect goes to the target and rolls to hit (d10 against the effective Agility).
- Effects (tokens, do not stack, last until the end of the fight): Weakness −2 on the damage of the target's moves; Poison 1 heart at the end of each of the target's turns; Paralysis (d10 1 to 4 on the target's turn: does not attack); Sleep (target loses its next turn, token goes); Swift +3 Agility (cap 8); Shield (next move received deals 0, token goes); Extra Strength +2 damage; Heal (instant) 1d6 hearts up to max health.
- Area: in 1 vs 1 it is a normal move.
- Health: 1 heart = 1 point. Max health = base health + track hearts up to the progress, capped at 16. Zero health loses the fight.
- Unlocked moves: the first starts unlocked. The others unlock at the track's `skill` mark (new format: `detail` is the move number, 1 to 4; legacy format: `detail` is the name). With no mark with the number, the i-th skill mark in position order applies.
- Stars: `progress` limits the stars done. The distribution follows the `--stars` policy, respecting each attribute's slots.
- Strength: the Strength marks done up to the progress are added automatically.
- Power: +1 on the move's die (only moves with a die), when the move is unlocked and the mark is done up to the progress.
- Evolution: the evolved form (no `attributes` in the JSON) copies the current value of each attribute of the previous form at the evolution mark, with no +1. The evolved form's slots are the total of star marks ÷ 4.

## Default choice policy

Each move is worth `expected damage + effect value` (in hearts); it picks the highest, ties go to the first in the list. Expected damage: P(hit) x exact average damage (considers element, Defense, Shield and Swift of the target, and the attacker's tokens). The effect value is 0 if the token is already applied; otherwise, for at most 3 turns (fewer if the target dies first), it measures damage avoided or dealt:

| Effect | Value |
|---|---|
| Weakness | 2 x P(target hits me) per turn |
| Poison | 1 per turn |
| Paralysis | 40% x target's best expected damage, per turn |
| Sleep | target's best expected damage (1 turn) |
| Swift | 0.3 x target's best expected damage, per turn (0 if I already have Agility 8) |
| Shield | target's best expected damage (cancels 1 move) |
| Extra Strength | 2 x P(hit) per turn |
| Heal | average of min(1d6, missing hearts) |

In practice: the effect is used early (first turn, not applied yet) when it is worth more than the best attack, and is not repeated while the token is active. A negative effect on a support move is multiplied by the hit chance. The `random` policy picks among all available moves, including support moves.

## Simulator interpretations (implementation decisions)

These points are not settled in the rules. The simulator picked one reading and makes it explicit here:

1. **Copy on evolution.** Full copy of the current value (base + stars + automatic Strength) as the new form's base, following "the new card gets the current value". There is no cut by the new slots. So the "lost excess" of section 14 is not applied.
2. **Tie.** The literal rule of section 6 gives damage 1 when the result is zero after Defense. For an immune move, the simulator returns 0 before any other math. Without that, immune with Defense 0 would give 1.
3. **Charge on a move that misses.** The charge is spent even if the move misses.
4. **Power before the type effect.** The +1 goes on the die, as section 4 says ("+1 on the die result"). So power is also multiplied by ×2 against vulnerable.
5. **Turn with no move.** If the side has no available move, the turn passes and counts as a turn.
6. **Turn limit.** A battle that reaches 1000 actions without a KO ends as `limit`, with no winner. The CLI counts it as a draw. It can happen when one side never hits the other.
7. **Turns.** The average turn count counts attack actions (and lost turns or turns with no move), not rounds.
8. **Damage adjustments go into the subtotal.** Extra Strength (+2) and Weakness (−2) add up with die, attribute and Power before the type effect (so vulnerable doubles the +2). With both tokens, they add −2 and +2 = 0.
9. **Shield only cancels damage.** Consumes the token when a die move hits (even if the damage would already be 0 from immunity). A miss does not consume it. The move's effect (e.g. Poison) is still applied. A negative support move does not consume the Shield.
10. **Negative effect only on a hit; positive always.** On a move with a die and an effect, the negative one requires a hit; the positive one (e.g. Extra Strength alongside damage) is applied on itself when the move is used, hit or miss.
11. **Poison and Sleep skipped turns still count.** Poison ticks at the end of every turn of the poisoned side, including a turn lost to Sleep or Paralysis. If poison kills, the other side wins. Paralysis rolls the d10 every turn while the token exists and the token does not go.
12. **Initiative uses base Agility**, without cap 8 and without tokens (they do not exist yet at the start of the fight). Only the hit uses the effective Agility with cap 8.
13. **Swift with cap.** Effective Agility = minimum of 8 and (base + 3 with Swift). A base above 8 is also capped at 8 for the hit.
14. **Power on support.** Power marks on a move with no die are ignored.
15. **Move 1 unlimited** is enforced by the card even if the JSON has `charges` on it.

## What the simulator does NOT model yet

- **Critical hit.** The rule (natural 10 on the d10) is pending in the rules, not decided.
- **Capture.** There is no capture DC per species in the data (see review, item M3). There is also no capture attempt nor wild creature.
- **Fleeing.** Not modeled.
- **Rest and Healing Center.** No recovery of hearts or charges outside Heal in a fight. The rest rule for limited moves is open (section 7).
- **Switching creatures and splitting XP.** Not modeled. Combat is 1 vs 1, with one card per side.
- **XP.** The simulator does not use the printed value.
- **Dual typing beyond what is in `resistances`.** The type effect uses the JSON `resistances` map, which already holds the combined effect of two types.
- **Area moves against several targets.** There is only 1 vs 1, where Area changes nothing.

## Reference numbers (legacy format, outdated)

Values from the legacy move format, before the new catalog; run the simulator for the current ones. Creatures 25 against 1 from the test scenario, default policy, stars `even`, N=2000:

| Progress | 25 wins | 1 wins | Average turns |
|---|---|---|---|
| 10 | 13.5% | 86.5% | 5.7 |
| 25 | 80.5% | 19.4% | 3.9 |
| 50 | 84.7% | 15.3% | 3.8 |

These numbers are for checking the simulator, not for deciding balance. The decision on the evolution rule (review, item A2) changes the comparison between evolved forms.
