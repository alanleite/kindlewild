import { nextClickValue, rest, healthAfterProgress, TRACK } from '../rules.mjs';
import { normalizeResistances } from '../resistances.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const ATTRS = ['strength', 'energy', 'agility', 'defense'];
const TYPE_COLOR = { normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', plant: '#7ac74c', electric: '#f7d02c', ice: '#96d9d6', fighter: '#c22e28', poison: '#a33ea1', earth: '#e2bf65', air: '#a98ff3', psychic: '#f95587', insect: '#a6b91a', stone: '#b6a136', ghost: '#735797', dragon: '#6f35fc' };
const RESIST_MARK = { vulnerable: '×2', resistant: '½' };
const MARK_ICON = { skill: '🗝️', star: '⭐', heart: '❤️', strength: '👊', power: '⬆️', evolution: '✨' };
const localizeOr = (key, fallback) => (game.i18n.has(key) ? game.i18n.localize(key) : fallback);
const typeName = (t) => localizeOr(`KINDLEWILD.Type.${t}`, t);
const effectName = (e) => localizeOr(`KINDLEWILD.Effect.${e}`, e);

export class CreatureSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['kindlewild', 'creature-sheet'],
    position: { width: 560, height: 'auto' },
    window: { resizable: true },
    actions: {
      heart: CreatureSheet.#heart,
      star: CreatureSheet.#star,
      unlock: CreatureSheet.#unlock,
      progress: CreatureSheet.#progress,
      healingCenter: CreatureSheet.#healingCenter,
      rest: CreatureSheet.#rest,
      roll: CreatureSheet.#roll
    }
  };

  static PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    card: { template: 'systems/kindlewild/templates/sheet-card.hbs' },
    track: { template: 'systems/kindlewild/templates/sheet-track.hbs' }
  };

  static TABS = {
    primary: {
      tabs: [{ id: 'card', label: 'KINDLEWILD.Tab.Card' }, { id: 'track', label: 'KINDLEWILD.Tab.Track' }],
      initial: 'card'
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const s = this.actor.system;
    context.actor = this.actor;
    context.system = s;
    context.tabs = this._prepareTabs('primary');
    context.number = String(s.speciesId).padStart(3, '0');
    context.typeColor = TYPE_COLOR[s.types[0]] ?? '#999';
    context.types = s.types.map((t) => ({ name: typeName(t), color: TYPE_COLOR[t] ?? '#999' }));
    context.hearts = Array.from({ length: s.health.max }, (_, i) => ({ index: i + 1, full: i < s.health.value }));
    context.attributes = ATTRS.map((a) => ({
      key: a,
      label: game.i18n.localize(`KINDLEWILD.Attribute.${a}`),
      boxes: Array.from({ length: s.attributes[a].slots }, (_, i) => ({ index: i + 1, natural: i < s.attributes[a].base, full: i < s.attributes[a].base + s.attributes[a].stars }))
    }));
    context.moves = this.actor.items
      .filter((i) => i.type === 'move')
      .sort((a, b) => a.system.order - b.system.order)
      .map((i) => ({
        id: i.id,
        name: i.name,
        sys: i.system,
        attribute: i.system.attribute ? game.i18n.localize(`KINDLEWILD.Attribute.${i.system.attribute}`) : '',
        effect: i.system.effect ? effectName(i.system.effect) : '',
        elementColor: TYPE_COLOR[i.system.element] ?? '#999',
        unlocked: i.system.order === 1 || i.system.unlocked,
        dots: i.system.charges.max ? Array.from({ length: i.system.charges.max }, (_, k) => ({ full: k < (i.system.charges.value ?? 0) })) : []
      }));
    const byPos = new Map();
    for (const m of s.track.marks) byPos.set(m.pos, [...(byPos.get(m.pos) || []), m]);
    context.track = Array.from({ length: TRACK }, (_, i) => {
      const pos = i + 1;
      const marks = byPos.get(pos) || [];
      return { pos, crossed: pos <= s.track.progress, icon: marks.map((m) => MARK_ICON[m.kind] ?? '•').join(''), kind: marks[0]?.kind ?? '' };
    });
    const order = { resistant: 0, vulnerable: 1 };
    context.resistances = Object.entries(normalizeResistances(s.resistances))
      .sort((a, b) => (order[a[1]] ?? 9) - (order[b[1]] ?? 9))
      .map(([element, effect]) => ({ name: typeName(element), color: TYPE_COLOR[element] ?? '#999', effect, mark: RESIST_MARK[effect] ?? '' }));
    return context;
  }

  async _preparePartContext(partId, context, options) {
    const c = await super._preparePartContext(partId, context, options);
    c.tab = c.tabs?.[partId];
    return c;
  }

  static async #heart(event, target) {
    const s = this.actor.system;
    await this.actor.update({ 'system.health.value': nextClickValue(s.health.value, Number(target.dataset.index), s.health.max) });
  }

  static async #star(event, target) {
    const a = target.dataset.attribute;
    const attr = this.actor.system.attributes[a];
    const index = Number(target.dataset.index) - attr.base;
    if (index <= 0) return;
    await this.actor.update({ [`system.attributes.${a}.stars`]: nextClickValue(attr.stars, index, attr.slots - attr.base) });
  }

  static async #unlock(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item || item.system.order === 1) return;
    await item.update({ 'system.unlocked': !item.system.unlocked });
  }

  static async #progress(event, target) {
    const s = this.actor.system;
    const progress = nextClickValue(s.track.progress, Number(target.dataset.pos), TRACK);
    await this.actor.update({
      'system.track.progress': progress,
      'system.health.value': healthAfterProgress(s.health.base, s.track.marks, progress, s.health.value)
    });
  }

  static async #healingCenter() {
    await this.actor.update({ 'system.health.value': this.actor.system.health.max });
    const recharges = this.actor.items
      .filter((i) => i.type === 'move' && i.system.charges.max)
      .map((i) => ({ _id: i.id, 'system.charges.value': i.system.charges.max }));
    if (recharges.length) await this.actor.updateEmbeddedDocuments('Item', recharges);
  }

  static async #rest() {
    const h = this.actor.system.health;
    await this.actor.update({ 'system.health.value': rest(h.value, h.max) });
  }

  static async #roll(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const { rollMove } = await import('../roll.mjs');
    await rollMove(this.actor, item);
  }
}
