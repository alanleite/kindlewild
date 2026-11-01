import { vidaMaxima } from '../regras.mjs';

const { NumberField, StringField, BooleanField, SchemaField, ArrayField, ObjectField } = foundry.data.fields;
const inteiro = (inicial = 0, extra = {}) => new NumberField({ required: true, integer: true, min: 0, initial: inicial, ...extra });
const atributo = () => new SchemaField({ slots: inteiro(1), estrelas: inteiro(0) });

export class CriaturaData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      especieId: inteiro(0),
      tamanho: new StringField({ initial: 'medio', choices: ['pequeno', 'medio', 'grande'] }),
      tipos: new ArrayField(new StringField()),
      raro: new BooleanField({ initial: false }),
      xp: inteiro(1),
      herdaAtributos: new BooleanField({ initial: false }),
      evolucao: new ArrayField(new SchemaField({
        para: new StringField({ required: true }),
        pos: inteiro(0),
        requisito: new StringField({ required: false, nullable: true, initial: null })
      })),
      vida: new SchemaField({ base: inteiro(6), value: inteiro(6) }),
      atributos: new SchemaField({ forca: atributo(), energia: atributo(), agilidade: atributo(), defesa: atributo() }),
      trilho: new SchemaField({
        progresso: inteiro(0, { max: 70 }),
        marcas: new ArrayField(new SchemaField({
          pos: inteiro(1),
          tipo: new StringField({ required: true }),
          detalhe: new StringField({ required: false, nullable: true, initial: null })
        }))
      }),
      resistencias: new ObjectField()
    };
  }

  static migrateData(source) {
    if (source.vida && source.vida.value === undefined && source.vida.valor !== undefined) source.vida.value = source.vida.valor;
    return super.migrateData(source);
  }

  prepareDerivedData() {
    this.vida.max = vidaMaxima(this.vida.base, this.trilho.marcas, this.trilho.progresso);
    this.vida.value = Math.min(this.vida.value, this.vida.max);
    for (const a of Object.values(this.atributos)) a.estrelas = Math.min(a.estrelas, a.slots);
  }
}
