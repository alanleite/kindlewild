const { NumberField, StringField, BooleanField, SchemaField } = foundry.data.fields;
const optional = () => new StringField({ required: false, nullable: true, initial: null });

export class MoveData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      element: new StringField({ initial: 'normal' }),
      attribute: optional(),
      die: optional(),
      charges: new SchemaField({
        value: new NumberField({ integer: true, min: 0, nullable: true, initial: null }),
        max: new NumberField({ integer: true, min: 1, nullable: true, initial: null })
      }),
      effect: optional(),
      area: new BooleanField({ initial: false }),
      weight: new NumberField({ integer: true, min: 0, initial: 0 }),
      order: new NumberField({ integer: true, min: 1, max: 4, initial: 1 }),
      unlocked: new BooleanField({ initial: false })
    };
  }
}
