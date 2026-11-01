import { CreatureData } from './module/data/creature.mjs';
import { MoveData } from './module/data/move.mjs';
import { CreatureSheet } from './module/sheet/creature-sheet.mjs';

Hooks.once('init', () => {
  CONFIG.Actor.dataModels.creature = CreatureData;
  CONFIG.Item.dataModels.move = MoveData;
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  DocumentSheetConfig.registerSheet(Actor, 'kindlewild', CreatureSheet, { types: ['creature'], makeDefault: true, label: 'Kindlewild: Creature' });
  console.log('Kindlewild | ready');
});
