import { CriaturaData } from './module/dados/criatura.mjs';
import { GolpeData } from './module/dados/golpe.mjs';
import { CriaturaSheet } from './module/ficha/ficha-criatura.mjs';

Hooks.once('init', () => {
  CONFIG.Actor.dataModels.criatura = CriaturaData;
  CONFIG.Item.dataModels.golpe = GolpeData;
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  DocumentSheetConfig.registerSheet(Actor, 'kindlewild', CriaturaSheet, { types: ['criatura'], makeDefault: true, label: 'Kindlewild: Criatura' });
  console.log('Kindlewild | pronto');
});
