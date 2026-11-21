# Rules: Kindlewild (v0.3)

Consolidated version of the rules and the layout. It replaces earlier versions of the rules where they conflict. Items marked **[to decide]** are still open.

The formulas and the checklist used to create or change tracks are in [`track-generation.md`](track-generation.md). Every new track must be validated against that document before it goes into the scenario's `creatures.json` (`scenarios/<id>/creatures.json`).

## 1. Purpose

Audience: young children who can't read well yet, playing with an adult (game master or companion) who reads the names out loud.

Three feelings the product must create:

1. "This creature is mine."
2. "My creature is getting stronger."
3. "I just got something new."

Campaign: the campaign, the species and the map come from the scenario (`scenarios/<id>/`). Combat is 1 vs 1, between two trainers, each with one creature on the table. No area moves.

## 2. Dice used

| Die | Use |
|---|---|
| **d4, d6, d8** | Move damage. Only these three. |
| **d10** | Hit roll in combat (against the target's Agility). |
| **d20** | Capture. |

No other dice in combat.

## 3. Card

- **One card per form, identified by the creature's number (field `id`).** E.g.: the three forms of the same line are three cards, with three numbers. Evolving = switching cards.
- **No padlock.** Moves and marks that are not unlocked yet show as an **empty square**. When the child unlocks one, they mark the square with pencil or pen. Works on paper with a pencil and an eraser.
- Size: A6 (105 × 148.5 mm). Printing: A4 portrait, 4 cards per sheet, 2 × 2 grid.
- **Front and back.**
- **Front, top to bottom:**
  1. Creature name.
  2. Large image (takes at least 40% of the height).
  3. Types (colored icons).
  4. Health in hearts.
  5. Attributes in boxes.
  6. Moves (4), each with name, icon, die and dots when it has limited uses.
  7. Resistances (up to 3 visible chips, see section 9).
- **Back:** XP track (50 boxes), and only that. Leaves room for the pen and for bigger icons.
- Allowed text: only the creature name and the move names. Everything else is icon, color or box.

## 4. Experience track

- It is **on the back** of the card.
- **Always 50 boxes**, for every species. Every creature reaches the end.
- Winning a fight gives XP even without a special mark: the child crosses out an empty box.
- Some positions have marks. Kinds of mark:
  - **Skill:** unlocks one of the 4 moves. The first one comes unlocked.
  - **Star:** the child colors +1 in an attribute of their choice, up to its slots.
  - **Heart:** automatic +1 health.
  - **Strength:** automatic +1 Strength.
  - **Power:** +1 to the die result of an already unlocked move.
  - **Evolution:** milestone that allows evolving (optional, with an item if needed).
- **Distribution:** the full generation and validation rule is in `docs/track-generation.md`, which is the **source of truth for tracks**. Summary:
  - Attribute bonuses (`star` and `strength`) are capped at 80% (can evolve) or 60% (does not evolve) of the extensible capacity, rounded down.
  - First bonus at position 3 or later, with at least 2 boxes between bonuses.
  - About 60% of the bonuses before the evolution, 40% after.
  - **Revoked:** the old rule of "at most 3 empty boxes in a row" is not compatible with the bonus cap. Long empty stretches are expected. The track is not filled with extra marks.
  - Old rules, kept:
  - The 4 skills are spread out: the first unlocks at the start, the other 3 in different ranges of the track (e.g.: one in the first third, one in the middle, one in the last third).
  - Power marks fall in the last third, so the child has something to look forward to. The Evolution position follows the distribution rule of the document (after about 60% of the bonuses), not the last third.
  - No repeated positions.
- **Fixed distribution per species:** each track is generated once with a seed based on the creature's number and is stored in the JSON. That way the printed card is always the same.

## 5. Attributes

Four attributes:

| Attribute | Role |
|---|---|
| **Strength** | Added to the damage of physical moves. |
| **Energy** | Added to the damage of elemental moves. |
| **Agility** | Chance to dodge (see section 6). |
| **Defense** | Reduces damage taken, against physical and elemental. |

- Each attribute has a **base** (filled boxes, from the species) and **slots** (total boxes, filled plus empty). Natural boxes are added without removing existing growth boxes.
- **Value = base + stars.** Minimum 0. No negative value.
- Base 0 and negative base: a negative base becomes 0. There is no penalty below zero.
**Slots per species (variable, from 2 to 5):**

- **2 slots:** initial form that will still evolve.
- **3 slots:** middle form.
- **4 slots:** last evolution of a line, or species with no common evolution.
- **5 slots:** rare species (legendary, unique, from a line with no evolution of its own). They have more room to grow over the campaign.

**Difference per stage (essential):** each evolved form gets visibly stronger, not just a bigger number. Minimum rule per form:

- **The move die goes up one step per form:** d4 → d6 → d8.
- **One new move per form:** the evolved form brings at least one move the previous one didn't have.
- **+1 health per form**, on top of what comes from the track.
- The three forms of the same line are clearly different from each other: die, moves and health.

Species with no evolution use the die according to their strength: d6 for common ones, d8 for rare ones or ones with special moves.

## 6. Combat

**Hit:**
- The attacker rolls d10.
- Hits only if the roll is greater than the target's **Agility**. Each point of effective Agility is a 10% dodge chance.
- Agility 0: always hits. Effective Agility is capped at 8, which dodges 80% of the time.
- The creature with higher Agility acts first; when tied, choose the first creature randomly.

**Damage:**
1. Roll the move's die (d4, d6 or d8) and add the attribute for the move's kind (Strength if physical, Energy if elemental).
2. Apply the target's type effect: vulnerable ×2, resistant half (rounded up), immune zero.
3. Subtract the target's Defense.
4. A negative result becomes 0. A tie (zero after defense) becomes 1.

**Example move:** Scratch, die d6, physical category. With Strength 2: 1d6 + 2.

**Moves with limited uses** (e.g.: Squirt): dots on the card. Basic moves: unlimited uses.

## 7. Health and recovery

- **Unit: 1 heart = 1 point of damage.** Damage left after defense removes hearts, one by one.
- High starting health. Reference scale: small and frail creature 7, sturdy final form 12–13, very tough creature 15–16. **Health is the main balancing knob.**
- Heart on the track: +1 health. The front shows starting hearts filled and future track hearts outlined; fill an outlined heart when unlocked. Cards support up to 24 hearts total.
- **Healing Center:** restores all hearts and all move uses.
- **Rest outside the Center:** restores half the hearts (rounded up). Limited moves only recover with a specific mark on the card **[to decide]** (rest icon next to some moves).

## 8. Capture

- Uses **d20**. Each species has a **base DC** (minimum number that must be rolled). Default: DC 17 (20%). Very powerful rare creature: DC 20 (5%).
- **Thresholds by the wild creature's current health:**
  - Up to 50% health: −1 to the DC (25%).
  - Up to 20% health: −2 to the DC (30%).
  - Cap of 30% in any case.
- **Narrative adjustments:** angry +1 or +2 to the DC; already friendly −1 or −2. Per species, not a fixed rule.
- **Three attempts:** each capture attempt is one roll. Three failures and the creature runs away.

## 9. Resistances

- Each species has types and may have resistances and vulnerabilities. Effects: **vulnerable** (×2), **resistant** (half, rounded up), **immune** (zero).
- **Layout problem:** species have 6 to 7 resistances. That is a lot for a small card and for a child.
- **[to decide]** Options:
  - a) Show only the 3 most relevant on the card, and the rest in the legend/sheet.
  - b) Group by category (e.g.: "fire and plant", "water and ice"), with one icon per group.
  - c) Show everything, but in a grid of large colored icons.
- Required legend: a reference page (or a strip on the back) showing what each icon and each color means. It can have text, because it is for the adult.

## 10. Printed XP

- Each species has an XP value printed on the card: boxes it gives when defeated. E.g.: a very powerful rare creature gives 3.
- **The game master controls the reward.** They can give less, zero, or give it for meaningful participation.
- Switching creatures in the middle of the battle splits the XP, rounding down, minimum 1.

## 11. Layout and design system

- **Colors:** each type has a color. States (colored, empty, locked, use spent) have distinct colors and shapes, not just gray.
- **Icons:** at least 1 cm for any clickable or markable icon. Thick stroke, no fine details.
- **Spacing:** 4 mm between the main blocks of the front. Inner spacing of each block follows the design system to fit on the A6 card. Track boxes with enough room for a pen.
- **Hierarchy:** the creature image is the dominant element. Name stands out. The rest is in the background.
- **Readability:** creature name at least 14 pt; move name smaller, about 12 pt and at most 2 lines. There is no other text on the printed card.
- **Printing:** white background, color preserved, nothing depends on a colored background to be understood (the paper is white).

## 12. Site evaluation criteria

The loop agent evaluates the site against these criteria. Each item can be checked by eye or by code:

1. Track: no run of more than 3 empty boxes in a row; marks spread over the whole track, not grouped at the start.
2. Text: only the creature name and the move names. Nothing else.
3. Icons: at least 1 cm; color per type; readable when printed.
4. Resistances: at most 3 icons visible on the card (or whatever is decided in 9).
5. Differentiation: two species of the same evolution line cannot have the same attribute and dice profile.
6. Spacing: 4 mm between the main blocks of the front; inner distances follow the design system.
7. Printing: 4 cards per A4 portrait sheet, no content cut off, no page break in the middle of a card.
8. Hierarchy: the image takes at least 40% of the card height.

## 13. Open items


- Resistances on the card (options a, b, c of section 9). **Not decided.**
- Moves with uses: how they recover outside the Center (specific mark or not).
- Final values of health, DC and slots per species: draft, to be calibrated.
- **Critical:** a natural 10 on the d10 hit roll gives +1 or +2 damage. Suggested critical, not confirmed yet.
- Language: Portuguese as the main one, English option later.
- Stack: plain HTML and JavaScript, with Next.js as a future option.

## 14. Decisions closed in this version

**Layout (author's decisions, 2026-10-04):**
- Spacing between blocks: **4 mm**.
- Maximum health: **24 hearts**, including heart rewards on the track (updated balance).
- Move name: **smaller than the previous version (4.2 mm)**. This overrides the 14 pt minimum of section 11. It is a conscious decision by the author, not a mistake.

**Assumed from the recommendation (you didn't answer; confirm or change):**
- Skills per card: **4**, the first at position 1.
- Evolution: **full** copy of the attributes (current value). No loss from fewer slots.
- Effective Agility **capped at 8** (maximum dodge of 80%).
- Immune is **always 0**. The tie (becomes 1) only happens when Defense zeroes a move that hit.


- Evolution switches cards. **The new card starts with an empty track, always, with no history.** No XP progress is carried over. Reason: an already evolved form captured in the wild starts exactly like a new card, so the rule has to hold in both cases.
- Consequence: skills, stars and powers earned in the previous form don't carry over to the new card. Each form starts from zero, with the first move unlocked.
- **Attributes on evolution (minimums and thresholds):**
  - The **values of the previous form become the minimum** of the new form. E.g.: a middle form with 2 Strength and 3 Energy → the final form starts with at least 2 and 3.
  - The **growth thresholds** (how high each attribute can go) come from the new species. E.g.: the final form goes up to 3 Strength and 4 Energy.
  - The proportion between attributes is kept. The new species changes the ceiling, not the identity.
  - General rule: the new form's threshold is **always equal or higher** than the previous one's.
  - Per-species exceptions are allowed, for big jumps in proportion (e.g.: a creature that got much bigger or stronger). Each exception must be flagged in the data.
  - There is no +1 for evolving. The gain comes from the bigger die, the new move, health and the new thresholds.
  - If the new form has fewer slots than the stars already placed in an attribute, the excess is **lost**. (Assumed, you didn't say anything about this. Confirm.)
  - Base forms (no previous evolution) use their own species' base.

- Health unit: 1 heart = 1 point of damage.
- Slots: variable per species, from 2 to 5 (see section 5).
- Difference per stage: die goes up one step, new move, +1 health per form.
- Track distribution: fixed per species (generated once). **Assumed**, you didn't answer this point explicitly.


## 15. Moves (2026-10-04)

Source of truth: `docs/moves.md` (move builder, approved).
- Damage dice: **d4, d6, d8 and d12** (d12 only on a final or rare form). Revokes "only d4, d6 and d8".
- Revokes "the die goes up one step per form": evolution raises the moves' weight budget.
- Move 1 always unlimited. Effects: Weakness, Poison, Paralysis, Sleep, Swift, Shield, Extra Strength, Heal. Area moves hit every enemy.
