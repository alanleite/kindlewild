// Converts a creature from scenarios/<id>/creatures.json into a Foundry actor document (with embedded moves).
// Images live in the scenario module: modules/<module>/assets/<file>.

export const SYSTEM = 'kindlewild';
const ATTRS = ['strength', 'energy', 'agility', 'defense'];
const three = (n) => String(n).padStart(3, '0');
const SIDE = { small: 0.5, medium: 1, large: 2 };

export const actorId = (id) => `crit${three(id)}000000000`;
export const moveId = (id, order) => `move${three(id)}${order}00000000`;
export const imageFile = (creature) => (creature.image ? creature.image.split('/').pop() : `${three(creature.id)}.png`);
export const DEFAULT_IMAGE = 'icons/svg/mystery-man.svg';
const image = (creature, module) => (creature.image ? `modules/${module}/assets/${imageFile(creature)}` : DEFAULT_IMAGE);

function root(creature, all) {
  let current = creature;
  while (current.inherits_attributes) {
    const child = current;
    current = all.find((p) => (p.evolutions || []).some((e) => e.into === child.name));
    if (!current) throw new Error(`${creature.name}: no previous form to inherit attributes from`);
  }
  return current;
}

function moveToItem(m, order, creature, ownerId) {
  const _id = moveId(creature.id, order);
  return {
    _id,
    _key: `!actors.items!${ownerId}.${_id}`,
    name: m.name,
    type: 'move',
    img: 'icons/svg/combat.svg',
    system: {
      element: m.element,
      attribute: m.attribute ?? null,
      die: m.die ?? null,
      charges: m.charges == null || order === 1 ? { value: null, max: null } : { value: m.charges, max: m.charges },
      effect: m.effect ?? null,
      area: Boolean(m.area),
      weight: m.weight ?? 0,
      order,
      unlocked: order === 1
    },
    flags: { [SYSTEM]: { icon: m.icon } }
  };
}

export function creatureToActor(creature, all, { module } = {}) {
  if (!module) throw new Error('creatureToActor: the scenario module is required');
  const _id = actorId(creature.id);
  const source = root(creature, all);
  const attributes = Object.fromEntries(ATTRS.map((a) => [a, { base: creature.inherits_attributes ? 0 : source.attributes[a].base, slots: source.attributes[a].slots, stars: 0 }]));
  const img = image(creature, module);
  return {
    _id,
    _key: `!actors!${_id}`,
    name: creature.name,
    type: 'creature',
    img,
    prototypeToken: { name: creature.name, texture: { src: img }, width: SIDE[creature.size] ?? 1, height: SIDE[creature.size] ?? 1, actorLink: false, disposition: 0 },
    system: {
      speciesId: creature.id,
      size: creature.size ?? 'medium',
      types: creature.types,
      rare: Boolean(creature.rare),
      xp: creature.xp ?? 1,
      inheritsAttributes: Boolean(creature.inherits_attributes),
      evolutions: (creature.evolutions || []).map((e) => ({ into: e.into, pos: e.pos, requires: e.requires ?? null })),
      health: { base: creature.health, value: creature.health },
      attributes,
      track: {
        progress: 0,
        marks: creature.track.map((m) => ({ pos: m.pos, kind: m.kind, detail: m.detail == null ? null : String(m.detail) }))
      },
      resistances: creature.resistances || {}
    },
    items: creature.moves.map((m, i) => moveToItem(m, i + 1, creature, _id))
  };
}
