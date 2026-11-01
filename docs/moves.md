# Move builder (draft v0.2)

Replaces v0.1 (closed list of 48 moves). The author's idea: instead of a list of moves, there is a list of **pieces**. Each move is built from these pieces, and each piece has a **weight** in points. The move's name is **narrative**, chosen to fit the creature (only a legendary fire bird has "Wings of Fire"). Balancing happens through the sum of the weights of the 4 moves.

Status: **approved by the author on 2026-10-04** (all decisions in section 4). Weights and budgets are the starting point, to be calibrated in the simulator.

## 1. Pieces of a move

Every move is: **die + attribute + element + charges + (effect) + (area)**.

### 1.1 Die (damage)

| Die | Average | Weight |
|---|---|---|
| d4 | 2.5 | 1 |
| d6 | 3.5 | 2 |
| d8 | 4.5 | 3 |
| d12 | 6.5 | 5 |

A support move (no damage) has no die: weight 0 for this piece.

### 1.2 Attribute

**Strength** (physical move) or **Energy** (elemental move). Weight **0**: it is just the move's style.

### 1.3 Element

Any type from the scenario's list (`scenarios/<id>/types.json`: fire, water, plant…), or neutral. Weight **0**: the type table already balances advantage and disadvantage.

### 1.4 Charges (uses)

| Charges | Weight |
|---|---|
| Unlimited | 0 |
| 3 uses | −1 |
| 2 uses | −1 |
| 1 use | −2 |

A limited move is cheaper, so it can have a bigger die for the same cost.

### 1.5 Effect (optional, at most one per move)

Negative (on the target, only on a hit):

| Effect | What it does | Weight |
|---|---|---|
| Weakness | −2 to the damage of the target's moves | 1 |
| Poison | Target loses 1 heart at the end of each of its turns | 2 |
| Paralysis | On the target's turn, d10 from 1 to 4: it doesn't attack | 2 |
| Sleep | Target loses its next turn | 2 |

Positive (on the creature itself):

| Effect | What it does | Weight |
|---|---|---|
| Swift | +3 Agility (maximum 8) | 1 |
| Shield | The next move received does 0 | 1 |
| Extra Strength | +2 to the damage of its own moves | 2 |
| Heal | Restores 1d6 hearts | 2 |

Effect rules: each one is a token with a drawing; they don't stack; they go away at the end of the fight (Sleep and Shield go away after acting).

### 1.6 Area (optional)

Hits **every enemy**. Weight **+2**. Damage is rolled once; each target applies its own resistance and Defense; the hit roll (d10) is rolled against each target.

## 2. Weight of a move

```text
move weight = die + charges + effect + area   (minimum 0)
```

Examples:

| Move (narrative name) | Build | Weight |
|---|---|---|
| Spark | d4, Energy, fire, unlimited | 1 |
| Blaze | d8, Energy, fire, 2 uses | 2 |
| Wings of Fire (legendary fire bird) | d12, Energy, fire, 1 use, area | 5 |
| Toxic Sting | d4, Strength, poison, 3 uses, Poison | 2 |
| Pó Sonolento | support, 2 uses, Sleep | 1 |
| Onda Mental (rare psychic creature) | d12, Energy, psychic, 2 uses, Paralysis | 6 |

## 3. Budget per creature

The sum of the weights of the 4 moves has a ceiling by stage. This defines how strong the creature is.

| Stage | Budget (sum of the 4) |
|---|---|
| Initial | 6 |
| Middle | 9 |
| Final | 12 |
| No common evolution | 11 |
| Rare (legendary and unique, field `rare`) | 16 |

Evolution raises the budget: the new form gets stronger moves (same narrative name with a bigger die, or a new move). This replaces the old rule "the die goes up one step per form".

Build rules:

1. **Move 1 is always unlimited** (the child always has something to do).
2. At most **one support move** per card.
3. At least **one move of the species' main type**.
4. d12 only on a final form, rare, or species with no evolution (no evolution counts as a final form; build adjustment, to fit the budget of 11).

## 4. Open decisions

1. **Is d12 in?** The current rule only allows d4, d6 and d8. With the d12, the strongest moves go up a lot (6.5 average).
2. **Weights:** is the weight table (die 1/2/3/5, charges, effects 1–2, area +2) good as a starting point?
3. **Budgets per stage:** 6 / 9 / 12 / 11 / 16.
4. **Build rules:** move 1 unlimited, at most one support, d12 only on final or rare.
5. **Effects:** do the 4 negative and 4 positive ones stay like this?

After closing these, the next step is to build the 4 moves of each species in the scenario (narrative name + pieces; 151 in the test scenario), validate the budget with a script, and only then go back to balancing.
