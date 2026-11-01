#!/usr/bin/env node
'use strict';

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`OK    ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

test('The visual scale uses the creature image_scale field and is 1 without it', () => {
  const scale = require('./image-scale');
  assert(scale.get({ id: 1 }) === 1, 'without image_scale it should be 1');
  assert(scale.get(null) === 1, 'without a creature it should be 1');
  assert(scale.get({ image_scale: 1.07 }) === 1.07, 'it should use the image_scale field');
  assert(scale.get({ image_scale: 2 }) === scale.cap, 'it should be limited to the cap');
});

test('The visual scale of the scenario creatures stays within the safe limit', () => {
  const scale = require('./image-scale');
  const creatures = require('../lib/scenario').creatures();
  for (const c of creatures) {
    const factor = scale.get(c);
    assert(factor >= 1 && factor <= 1.18, `${c.name} has an unsafe factor ${factor}`);
    if (c.image_scale !== undefined) assert(c.image_scale <= 1.18, `${c.name}: image_scale above the cap`);
  }
});

test('Printing contains only the checked creatures, in number order', () => {
  let selection;
  try {
    selection = require('./print-selection');
  } catch (_) {
    assert(false, 'print selection module does not exist yet');
  }
  const species = [
    { id: 3, name: 'Forma Final' },
    { id: 1, name: 'Forma Inicial' },
    { id: 2, name: 'Forma Media' }
  ];
  const result = selection.filter(species, new Set([1, 3]));
  assert(result.length === 2, `expected 2 selected, got ${result.length}`);
  assert(result[0].id === 1 && result[1].id === 3, 'the selection lost the number order');
});

test('Search matches name, plain number, padded number and number with hash', () => {
  let selection;
  try {
    selection = require('./print-selection');
  } catch (_) {
    assert(false, 'print selection module does not exist yet');
  }
  const faiscote = { id: 25, name: 'Faiscote' };
  for (const term of ['faiscote', '25', '025', '#025']) {
    assert(selection.matchesSearch(faiscote, term), `search did not match ${term}`);
  }
  assert(!selection.matchesSearch(faiscote, 'brasa'), 'search accepted a different name');
});

test('All creatures start selected exactly once', () => {
  let selection;
  try {
    selection = require('./print-selection');
  } catch (_) {
    assert(false, 'print selection module does not exist yet');
  }
  const ids = selection.selectAll([{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }]);
  assert(ids instanceof Set, 'the initial selection must be a Set');
  assert(ids.size === 3 && ids.has(1) && ids.has(2) && ids.has(3), 'the initial selection does not contain all unique IDs');
});

test('The empty state disables printing and the partial state counts sheets', () => {
  let selection;
  try {
    selection = require('./print-selection');
  } catch (_) {
    assert(false, 'print selection module does not exist yet');
  }
  const empty = selection.summarize(0, 151, 4);
  assert(empty.printDisabled, 'printing should be disabled without cards');
  assert(empty.sheets === 0 && empty.text === '0 selected · no sheets', 'the empty summary is wrong');
  const partial = selection.summarize(5, 151, 4);
  assert(!partial.printDisabled, 'printing should be enabled with cards');
  assert(partial.sheets === 2 && partial.text === '5 selected · 2 sheets front and back', 'the partial summary is wrong');
});

test('The fifth card starts a second print sheet', () => {
  let selection;
  try {
    selection = require('./print-selection');
  } catch (_) {
    assert(false, 'print selection module does not exist yet');
  }
  const cards = [1, 2, 3, 4, 5].map((id) => ({ id }));
  const sheets = selection.group(cards, 4);
  assert(sheets.length === 2, `expected 2 sheets, got ${sheets.length}`);
  assert(sheets[0].length === 4 && sheets[1].length === 1, 'cards were not grouped as 4 + 1');
});

test('The back mirrors the columns and stays behind the matching front', () => {
  let selection;
  try {
    selection = require('./print-selection');
  } catch (_) {
    assert(false, 'print selection module does not exist yet');
  }
  const front = [{ id: 25 }, { id: 26 }, { id: 27 }];
  const back = selection.mirrorBack(front);
  assert(back.length === 4, `the back must keep 4 positions, got ${back.length}`);
  assert(back[0].id === 26 && back[1].id === 25, 'the first row of the back was not mirrored');
  assert(back[2] === undefined && back[3].id === 27, 'the empty position was not mirrored with the third card');
});

test('The printed back uses the current 70-box track in a 7 by 10 grid', () => {
  let selection;
  try {
    selection = require('./print-selection');
  } catch (_) {
    assert(false, 'print selection module does not exist yet');
  }
  const track = selection.trackConfig();
  assert(track.size === 70, `expected 70 boxes, got ${track.size}`);
  assert(track.columns === 7 && track.rows === 10, 'the track must be laid out in 7 columns by 10 rows');
  assert(track.positions.length === 70, `expected 70 positions, got ${track.positions.length}`);
  assert(track.positions[0] === 1 && track.positions[69] === 70, 'positions must cover the range 1 to 70');
});

test('Structural validation accepts long gaps and evolution before the final third', () => {
  const selection = require('./print-selection');
  const problems = selection.validateTrackStructure({
    track: [
      { pos: 1, kind: 'skill' },
      { pos: 2, kind: 'heart' },
      { pos: 3, kind: 'star' },
      { pos: 6, kind: 'strength' },
      { pos: 32, kind: 'evolution' },
      { pos: 70, kind: 'power' }
    ]
  });
  assert(problems.length === 0, `the valid track got obsolete warnings: ${problems.join('; ')}`);
});

test('Structural validation rejects repeated positions or positions outside the 70 boxes', () => {
  const selection = require('./print-selection');
  const problems = selection.validateTrackStructure({
    track: [
      { pos: 3, kind: 'star' },
      { pos: 3, kind: 'strength' },
      { pos: 71, kind: 'heart' }
    ]
  });
  assert(problems.includes('repeated position'), 'the repeated position was not detected');
  assert(problems.includes('mark outside positions 1 to 70'), 'the position outside the track was not detected');
});

test('Valid dice appear as simple text notation', () => {
  let view;
  try {
    view = require('./card-view');
  } catch (_) {
    assert(false, 'card view module does not exist yet');
  }
  assert(view.dieLabel('d4') === 'd4', 'd4 was not preserved');
  assert(view.dieLabel('d6') === 'd6', 'd6 was not preserved');
  assert(view.dieLabel('d8') === 'd8', 'd8 was not preserved');
  assert(view.dieLabel('d12') === 'd12', 'd12 was not preserved');
  assert(view.dieLabel('d10') === null, 'd10 should not be accepted by the current rules');
  for (const invalid of ['toString', 'constructor', '__proto__', '', null, 4]) {
    assert(view.dieLabel(invalid) === null, `${String(invalid)} should not be accepted as a die`);
  }
});

test('The header gets at most the first two valid types', () => {
  let view;
  try {
    view = require('./card-view');
  } catch (_) {
    assert(false, 'card view module does not exist yet');
  }
  const types = view.headerTypes(['water', '', null, 'ice', 'air']);
  assert(types.length === 2, `expected 2 types, got ${types.length}`);
  assert(types[0] === 'water' && types[1] === 'ice', 'the valid types lost their order');
});

test('A legacy move is normalized and a support move is validated', () => {
  const view = require('./card-view');
  const old = view.normalizeMove({ name: 'A', type: 'fire', category: 'elemental', die: 'd6', uses: 2 });
  assert(old.element === 'fire' && old.attribute === 'energy' && old.charges === 2, 'legacy format converted wrongly');
  const support = view.normalizeMove({ name: 'S', element: 'normal', attribute: null, die: null, charges: 2, effect: 'sleep', area: false });
  assert(view.moveProblems(support).length === 0, 'a valid support move got problems');
  assert(view.moveProblems(view.normalizeMove({ name: 'X', die: null, attribute: null })).length === 1, 'a support move without an effect should be flagged');
});

test('A creature can have several evolution marks at position 40, and only there', () => {
  const selection = require('./print-selection');
  assert(selection.validateTrackStructure({ track: [{ pos: 40, kind: 'evolution' }, { pos: 40, kind: 'evolution' }] }).length === 0, 'repetition at 40 should pass');
  assert(selection.validateTrackStructure({ track: [{ pos: 41, kind: 'evolution' }, { pos: 41, kind: 'evolution' }] }).includes('repeated position'), 'repetition outside 40 should fail');
});

console.log('');
console.log(failures === 0 ? 'All site tests passed.' : `${failures} test(s) failed.`);
if (failures > 0) process.exitCode = 1;
