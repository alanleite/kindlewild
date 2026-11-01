// Converte uma criatura de cenarios/<id>/criaturas.json num documento de ator do Foundry (com golpes embutidos).
// As imagens ficam no módulo do cenário: modules/<modulo>/assets/<arquivo>.

export const SISTEMA = 'kindlewild';
const ATRS = ['forca', 'energia', 'agilidade', 'defesa'];
const tres = (n) => String(n).padStart(3, '0');
const LADO = { pequeno: 0.5, medio: 1, grande: 2 };

export const idAtor = (id) => `crit${tres(id)}000000000`;
export const idGolpe = (id, ordem) => `golp${tres(id)}${ordem}00000000`;
export const arquivoImagem = (especie) => (especie.imagem ? especie.imagem.split('/').pop() : `${tres(especie.id)}.png`);
export const IMAGEM_PADRAO = 'icons/svg/mystery-man.svg';
const imagem = (especie, modulo) => (especie.imagem ? `modules/${modulo}/assets/${arquivoImagem(especie)}` : IMAGEM_PADRAO);

function raiz(especie, todas) {
  let atual = especie;
  while (atual.herda_atributos) {
    const filho = atual;
    atual = todas.find((p) => (p.evolucao || []).some((e) => e.para === filho.nome));
    if (!atual) throw new Error(`${especie.nome}: sem forma anterior para herdar atributos`);
  }
  return atual;
}

function golpeParaItem(g, ordem, especie, atorId) {
  const _id = idGolpe(especie.id, ordem);
  return {
    _id,
    _key: `!actors.items!${atorId}.${_id}`,
    name: g.nome,
    type: 'golpe',
    img: 'icons/svg/combat.svg',
    system: {
      elemento: g.elemento,
      atributo: g.atributo ?? null,
      dado: g.dado ?? null,
      cargas: g.cargas == null || ordem === 1 ? { valor: null, max: null } : { valor: g.cargas, max: g.cargas },
      efeito: g.efeito ?? null,
      area: Boolean(g.area),
      peso: g.peso ?? 0,
      ordem,
      liberado: ordem === 1
    },
    flags: { [SISTEMA]: { icone: g.icone } }
  };
}

export function especieParaAtor(especie, todas, { modulo } = {}) {
  if (!modulo) throw new Error('especieParaAtor: informe o módulo do cenário');
  const _id = idAtor(especie.id);
  const fonte = raiz(especie, todas);
  const atributos = Object.fromEntries(ATRS.map((a) => [a, { slots: fonte.atributos[a].slots, estrelas: 0 }]));
  const img = imagem(especie, modulo);
  return {
    _id,
    _key: `!actors!${_id}`,
    name: especie.nome,
    type: 'criatura',
    img,
    prototypeToken: { name: especie.nome, texture: { src: img }, width: LADO[especie.tamanho] ?? 1, height: LADO[especie.tamanho] ?? 1, actorLink: false, disposition: 0 },
    system: {
      especieId: especie.id,
      tamanho: especie.tamanho ?? 'medio',
      tipos: especie.tipos,
      raro: Boolean(especie.raro),
      xp: especie.xp ?? 1,
      herdaAtributos: Boolean(especie.herda_atributos),
      evolucao: (especie.evolucao || []).map((e) => ({ para: e.para, pos: e.pos, requisito: e.requisito ?? null })),
      vida: { base: especie.vida, value: especie.vida },
      atributos,
      trilho: {
        progresso: 0,
        marcas: especie.trilho.map((m) => ({ pos: m.pos, tipo: m.tipo, detalhe: m.detalhe == null ? null : String(m.detalhe) }))
      },
      resistencias: especie.resistencias || {}
    },
    items: especie.golpes.map((g, i) => golpeParaItem(g, i + 1, especie, _id))
  };
}
