const { NumberField, StringField, BooleanField, SchemaField } = foundry.data.fields;
const opcional = () => new StringField({ required: false, nullable: true, initial: null });

export class GolpeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      elemento: new StringField({ initial: 'normal' }),
      atributo: opcional(),
      dado: opcional(),
      cargas: new SchemaField({
        valor: new NumberField({ integer: true, min: 0, nullable: true, initial: null }),
        max: new NumberField({ integer: true, min: 1, nullable: true, initial: null })
      }),
      efeito: opcional(),
      area: new BooleanField({ initial: false }),
      peso: new NumberField({ integer: true, min: 0, initial: 0 }),
      ordem: new NumberField({ integer: true, min: 1, max: 4, initial: 1 }),
      liberado: new BooleanField({ initial: false })
    };
  }
}
