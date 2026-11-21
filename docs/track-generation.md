# Rules for generating and validating creature tracks

This document is the **source of truth for creating or changing any track** in the scenario's `creatures.json` (`scenarios/<id>/creatures.json`).

Before a creature's track is considered ready, it must pass every rule and the checklist in this file.

## 1. Track structure

| Premise | Rule |
|---|---|
| Size | Every track has **70 boxes**, numbered 1 to 70. (Revised on 2026-10-04: it used to be 50.) |
| Positions | Two marks can never take the same box. |
| Order | Marks must be stored in increasing order of position. |
| Evolution | The evolution milestone does not end the track. The child can evolve or keep using the current form. |

## 2. What counts as an attribute bonus

For the percentages and spacing in this document, only marks that raise one of the four attributes count:

- `star`: the child chooses which attribute to raise;
- `strength`: raises Strength automatically.

These don't count:

- `skill`;
- `heart`;
- `power`;
- `evolution`.

These other rewards may have their own rules, but they don't use up the attribute growth cap.

## 3. Extensible capacity

Each attribute has:

- **base:** boxes that start filled;
- **slots:** total boxes drawn for that attribute.

The extensible capacity of an attribute is:

```text
attribute capacity = slots - max(0, base)
```

The creature's total extensible capacity is:

```text
total capacity =
  Strength capacity
  + Energy capacity
  + Agility capacity
  + Defense capacity
```

Mandatory rules:

1. `slots` can never be lower than the visible base.
2. A negative base counts as zero for this calculation.
3. One upgrade fills one empty box.
4. No distribution can go past the slots visible on the card.

## 4. Attribute bonus cap

| Species situation | Maximum bonuses on the track |
|---|---:|
| Can evolve into another form | 80% of the extensible capacity (rounded down) |
| Cannot evolve | 60% of the extensible capacity |

The result is always rounded down:

```text
cap = floor(total capacity x percentage)
```

Example:

```text
total extensible capacity: 8 boxes
creature that can evolve: floor(8 x 0.80) = 6 bonuses
```

Even after completing the whole track, the creature must not be able to fill every extensible box.

## 5. Bonus position and spacing

1. No attribute bonus can be earned on the first box.
2. There must be at least **two boxes before the first bonus**.
3. So the first allowed position for a bonus is position 3.
4. There must be at least **two boxes between two attribute bonuses**.
5. So the difference between the positions of two consecutive bonuses must be at least 3.

Valid example:

```text
bonuses at positions 3, 6, 10 and 14
```

Invalid examples:

```text
position 1: too early
positions 5 and 6: consecutive
positions 5 and 7: only one box between them
```

The initial skill can appear at position 1 to identify the move that comes unlocked. It is not an earned attribute bonus.

## 6. Distribution before and after evolution

For a form that can evolve:

- about 60% of the attribute bonuses go before the evolution milestone;
- the remaining 40% go after the evolution milestone.

Calculation:

```text
bonuses before = round(total bonuses x 0.60)
bonuses after = total bonuses - bonuses before
```

Example with 6 bonuses:

```text
4 bonuses before the evolution
2 bonuses after the evolution
```

The evolution milestone must be early enough for all later bonuses to fit by position 50, respecting the minimum spacing.

## 7. Choosing to evolve or to continue

On reaching the evolution milestone, there are two options.

### Evolve right away

- The child switches to the card of the evolved form.
- All attributes already filled are inherited.
- Bonuses not yet reached on the old card are no longer reachable.
- The evolved form starts its own track from the beginning.

### Don't evolve now

- The child keeps using the same card.
- They can advance past the evolution milestone.
- The final 40% of attribute bonuses reward the decision to postpone the evolution.
- If they evolve later, all attributes earned up to that moment are inherited.

## 8. Parameters of the first two areas prototype

Ten species from the first two areas of the test scenario's map were used to test these rules. All of them are initial forms that evolve.

In this prototype:

- each species has 8 extensible boxes in total;
- each species can receive 6 attribute bonuses;
- 4 bonuses go before the evolution;
- 2 bonuses go after the evolution;
- 2 automatic Strength upgrades and 4 choice stars were kept.

These numbers are prototype parameters, not a requirement for every species in the scenario. The formulas in the previous sections are the general rules.

## 9. Mandatory validation checklist

Before saving a track in the scenario's `creatures.json`, confirm:

- [ ] The track only has positions between 1 and 70.
- [ ] No position is repeated.
- [ ] Marks are sorted by position.
- [ ] Every attribute has `slots >= max(0, base)`.
- [ ] The extensible capacity was calculated by subtracting the base.
- [ ] `star` and `strength` were counted as attribute bonuses.
- [ ] A creature that can evolve doesn't go over 80% of the extensible capacity.
- [ ] A creature that can't evolve doesn't go over 60% of the extensible capacity.
- [ ] The percentage cap was rounded down.
- [ ] The first attribute bonus is at position 3 or later.
- [ ] There are at least two boxes between attribute bonuses.
- [ ] In forms that can evolve, about 60% of the bonuses are before the evolution.
- [ ] The remaining bonuses are after the evolution and fit by position 50.
- [ ] Evolution doesn't erase attributes already earned.
- [ ] Finishing the track doesn't allow filling the whole extensible capacity.

If any item fails, the track is not ready for printing yet.



## 10. Revision 2026-10-04: calibration by reference level

Author's decisions after playtest 1. They replace the evolution position and skill rules of the previous sections where they conflict.

### 10.1 Track

- Every card has **70 boxes**. There is no different track for initial forms.
- The track is distributed within the 70, respecting the bonus rules of sections 2 to 6.

### 10.2 Evolution

Author's rule, based on each species' reference evolution level (`L`). The reference level comes from the scenario (in the test scenario, the level from a reference table):

- **First stage** (form evolving for the first time):
  ```text
  evolution box = clamp(2 x L1, 10, 50)
  ```
  Where `L1` is the reference level at which the form evolves. Floor of **10** and ceiling of **50** (e.g.: initial form that evolves at level 7 → box 14; middle form that evolves at level 10, Lv 10 − 7 = 3 → 6, raised to 10).

- **Second stage** (form that already came from an evolution and evolves again):
  ```text
  evolution box = clamp(2 x (L2 - L1), 10, 50)
  ```
  Where `L2` is the level at which the form evolves the second time and `L1` is the level of the line's first evolution. In other words: the time the child spends in the middle form, measured in reference levels, times 2.

Author's example (author's values, not the real reference):
```text
Initial form evolves at 16 (reference)    -> 2 x 16 = 32  -> box 32
Middle form evolves at 32 (author)        -> 2 x (32 - 16) = 32 -> box 32
Final form: last form, no evolution
```

Notes:
- The formula measures **the levels spent in each stage**, not the absolute position in the evolution line. This is consistent with the empty-track-on-evolution rule (decision of 2026-10-04): each card counts from zero, and the evolution box is the time spent in the form.
- **Confirmed by the author:** it uses the **real reference level**. E.g.: the middle form evolves at 36 → 2 x (36 - 16) = **40**.
- **Evolution by stone:** the position is **40**, with no reference level. When the species has more than one stone (e.g.: a creature with several possible evolutions), **all of them go at 40**, with a single evolution marker (stone symbol). The child chooses the stone on getting there. The position may repeat: this is the only case allowed.
- **Evolution by trade** (four species in the test scenario): position **40**, same as the stone. Confirmed by the author.

### 10.3 Skills

Revised by the author: the reference level is **inspiration**, not an exact rule. The final adjustment is by feel. The goal is for skills to arrive neither too early nor too late.

- **Count:** each species has as many skills as moves on its card (2 to 4). The two insect cocoons of the test scenario have 2, which is characteristic of them.
- **First skill:** always on box 1 (move that comes unlocked).
- **Other skills:** positions inspired by the reference level at which the species learns the move, but adjusted by feel. Proposed guide (to be adjusted):
  - 2nd skill: between box 5 and 20.
  - 3rd skill: between box 15 and 40.
  - 4th skill: between box 30 and 65.
- **Spacing:** at least 3 boxes between skills. They can't be too close together.
- **Parity with evolution:** it is not required to have all of them before evolving. What matters is the feeling of progression, not a fixed number.
- **They can't land on top of a bonus or the evolution milestone.**

Glossary, to avoid confusion: a **skill** is the track mark that unlocks a move on the card. Each move on the card is unlocked by the skill with the same number: move 1 by skill 1, move 2 by skill 2, and so on. Unlocked move = marked square on the card.

### 10.4 Open items of this revision

1. ~~4 skills before evolving~~: **revoked.** It is by feel now. Skills follow the guide in section 10.3, with the author's adjustment.
2. **Skills 2 to 4:** confirm the "1st, 3rd and 5th × 2" rule. The multiplier can push a skill past 40 or 70. If that happens, it needs a cutoff rule.
3. **Level 2 move (e.g.: weak creature that learns its second move early):** box 1 is always skill 1. Open: whether a level 2 move can become skill 2 on box 2 (it stays outside the section 10.3 rule for now).
4. ~~Floor of 40 on all~~: **discarded.** Floor of 10 for level-based ones, 40 for stone and trade.
5. **Strong and weak moves:** data items, outside this document. Area moves and status skills: version 2.


### 10.5 Attributes start empty

- Historical decision (superseded): creatures originally started with zero natural attributes. They now start with species-specific filled boxes, in addition to the prior growth capacity. Calculate the capacity as `slots - base`.
- Evolved forms inherit the assigned attributes (author's decision, round 2).

## 11. Calibration 2026-10-04

- **Total slots per stage:** initial 12, no evolution 20, rare 28. Evolved forms inherit the slots of the root form. The split between attributes follows the species' profile (the scenario's reference stats), with a minimum of 1 per attribute.
- **Power mark:** `detail` is the move number (1 to 4), not the name.
