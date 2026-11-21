import { maxHealth } from '../rules.mjs';

const { NumberField, StringField, BooleanField, SchemaField, ArrayField, ObjectField } = foundry.data.fields;
const integer = (initial = 0, extra = {}) => new NumberField({ required: true, integer: true, min: 0, initial, ...extra });
const attribute = () => new SchemaField({ base: integer(0), slots: integer(1), stars: integer(0) });

export class CreatureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      speciesId: integer(0),
      size: new StringField({ initial: 'medium', choices: ['small', 'medium', 'large'] }),
      types: new ArrayField(new StringField()),
      rare: new BooleanField({ initial: false }),
      xp: integer(1),
      inheritsAttributes: new BooleanField({ initial: false }),
      evolutions: new ArrayField(new SchemaField({
        into: new StringField({ required: true }),
        pos: integer(0),
        requires: new StringField({ required: false, nullable: true, initial: null })
      })),
      health: new SchemaField({ base: integer(6), value: integer(6) }),
      attributes: new SchemaField({ strength: attribute(), energy: attribute(), agility: attribute(), defense: attribute() }),
      track: new SchemaField({
        progress: integer(0, { max: 70 }),
        marks: new ArrayField(new SchemaField({
          pos: integer(1),
          kind: new StringField({ required: true }),
          detail: new StringField({ required: false, nullable: true, initial: null })
        }))
      }),
      resistances: new ObjectField()
    };
  }

  static migrateData(source) {
    if (source.health && source.health.value === undefined && source.health.valor !== undefined) source.health.value = source.health.valor;
    return super.migrateData(source);
  }

  prepareDerivedData() {
    this.health.max = maxHealth(this.health.base, this.track.marks, this.track.progress);
    this.health.value = Math.min(this.health.value, this.health.max);
    for (const a of Object.values(this.attributes)) a.stars = Math.min(a.stars, Math.max(0, a.slots - a.base));
  }
}
