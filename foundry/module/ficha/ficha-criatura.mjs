import { proximoValorClique, descanso, vidaAposProgresso, TRILHO } from '../regras.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const ATRS = ['forca', 'energia', 'agilidade', 'defesa'];
const COR_TIPO = { normal: '#a8a77a', fogo: '#ee8130', agua: '#6390f0', planta: '#7ac74c', eletrico: '#f7d02c', gelo: '#96d9d6', lutador: '#c22e28', veneno: '#a33ea1', terra: '#e2bf65', voador: '#a98ff3', psiquico: '#f95587', inseto: '#a6b91a', pedra: '#b6a136', fantasma: '#735797', dragao: '#6f35fc' };
const NOME_TIPO = { normal: 'Normal', fogo: 'Fogo', agua: 'Água', planta: 'Planta', eletrico: 'Elétrico', gelo: 'Gelo', lutador: 'Lutador', veneno: 'Veneno', terra: 'Terra', voador: 'Voador', psiquico: 'Psíquico', inseto: 'Inseto', pedra: 'Pedra', fantasma: 'Fantasma', dragao: 'Dragão' };
const NOME_EFEITO = { fraqueza: 'Fraqueza', veneno: 'Veneno', paralisia: 'Paralisia', sono: 'Sono', ligeiro: 'Ligeiro', escudo: 'Escudo', forca_extra: 'Força Extra', cura: 'Cura' };
const MARCA_RESIST = { vulneravel: '×2', resistente: '½', imune: '0' };
const ICONE_MARCA = { habilidade: '🗝️', estrela: '⭐', coracao: '❤️', forca: '👊', poder: '⬆️', evolucao: '✨' };

export class CriaturaSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['kindlewild', 'ficha-criatura'],
    position: { width: 560, height: 'auto' },
    window: { resizable: true },
    actions: {
      coracao: CriaturaSheet.#coracao,
      estrela: CriaturaSheet.#estrela,
      liberar: CriaturaSheet.#liberar,
      progresso: CriaturaSheet.#progresso,
      centro: CriaturaSheet.#centro,
      descanso: CriaturaSheet.#descanso,
      rolar: CriaturaSheet.#rolar
    }
  };

  static PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    carta: { template: 'systems/kindlewild/templates/ficha-carta.hbs' },
    trilho: { template: 'systems/kindlewild/templates/ficha-trilho.hbs' }
  };

  static TABS = {
    primary: {
      tabs: [{ id: 'carta', label: 'KINDLEWILD.Aba.Carta' }, { id: 'trilho', label: 'KINDLEWILD.Aba.Trilho' }],
      initial: 'carta'
    }
  };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const s = this.actor.system;
    contexto.actor = this.actor;
    contexto.system = s;
    contexto.tabs = this._prepareTabs('primary');
    contexto.numero = String(s.especieId).padStart(3, '0');
    contexto.corTipo = COR_TIPO[s.tipos[0]] ?? '#999';
    contexto.tipos = s.tipos.map((t) => ({ nome: NOME_TIPO[t] ?? t, cor: COR_TIPO[t] ?? '#999' }));
    contexto.coracoes = Array.from({ length: s.vida.max }, (_, i) => ({ indice: i + 1, cheio: i < s.vida.value }));
    contexto.atributos = ATRS.map((a) => ({
      chave: a,
      rotulo: game.i18n.localize(`KINDLEWILD.Atributo.${a}`),
      caixas: Array.from({ length: s.atributos[a].slots }, (_, i) => ({ indice: i + 1, cheia: i < s.atributos[a].estrelas }))
    }));
    contexto.golpes = this.actor.items
      .filter((i) => i.type === 'golpe')
      .sort((a, b) => a.system.ordem - b.system.ordem)
      .map((i) => ({
        id: i.id,
        nome: i.name,
        sys: i.system,
        atributo: i.system.atributo ? game.i18n.localize(`KINDLEWILD.Atributo.${i.system.atributo}`) : '',
        efeito: i.system.efeito ? (NOME_EFEITO[i.system.efeito] ?? i.system.efeito) : '',
        corElemento: COR_TIPO[i.system.elemento] ?? '#999',
        liberado: i.system.ordem === 1 || i.system.liberado,
        bolinhas: i.system.cargas.max ? Array.from({ length: i.system.cargas.max }, (_, k) => ({ cheia: k < (i.system.cargas.valor ?? 0) })) : []
      }));
    const porPos = new Map();
    for (const m of s.trilho.marcas) porPos.set(m.pos, [...(porPos.get(m.pos) || []), m]);
    contexto.trilho = Array.from({ length: TRILHO }, (_, i) => {
      const pos = i + 1;
      const marcas = porPos.get(pos) || [];
      return { pos, riscado: pos <= s.trilho.progresso, icone: marcas.map((m) => ICONE_MARCA[m.tipo] ?? '•').join(''), tipo: marcas[0]?.tipo ?? '' };
    });
    const ordem = { vulneravel: 0, imune: 1, resistente: 2 };
    contexto.resistencias = Object.entries(s.resistencias)
      .sort((a, b) => (ordem[a[1]] ?? 9) - (ordem[b[1]] ?? 9))
      .map(([elemento, efeito]) => ({ nome: NOME_TIPO[elemento] ?? elemento, cor: COR_TIPO[elemento] ?? '#999', efeito, marca: MARCA_RESIST[efeito] ?? '' }));
    return contexto;
  }

  async _preparePartContext(partId, contexto, options) {
    const c = await super._preparePartContext(partId, contexto, options);
    c.tab = c.tabs?.[partId];
    return c;
  }

  static async #coracao(evento, alvo) {
    const s = this.actor.system;
    await this.actor.update({ 'system.vida.value': proximoValorClique(s.vida.value, Number(alvo.dataset.indice), s.vida.max) });
  }

  static async #estrela(evento, alvo) {
    const a = alvo.dataset.atributo;
    const atr = this.actor.system.atributos[a];
    await this.actor.update({ [`system.atributos.${a}.estrelas`]: proximoValorClique(atr.estrelas, Number(alvo.dataset.indice), atr.slots) });
  }

  static async #liberar(evento, alvo) {
    const item = this.actor.items.get(alvo.dataset.itemId);
    if (!item || item.system.ordem === 1) return;
    await item.update({ 'system.liberado': !item.system.liberado });
  }

  static async #progresso(evento, alvo) {
    const s = this.actor.system;
    const progresso = proximoValorClique(s.trilho.progresso, Number(alvo.dataset.pos), TRILHO);
    await this.actor.update({
      'system.trilho.progresso': progresso,
      'system.vida.value': vidaAposProgresso(s.vida.base, s.trilho.marcas, progresso, s.vida.value)
    });
  }

  static async #centro() {
    await this.actor.update({ 'system.vida.value': this.actor.system.vida.max });
    const recargas = this.actor.items
      .filter((i) => i.type === 'golpe' && i.system.cargas.max)
      .map((i) => ({ _id: i.id, 'system.cargas.valor': i.system.cargas.max }));
    if (recargas.length) await this.actor.updateEmbeddedDocuments('Item', recargas);
  }

  static async #descanso() {
    const v = this.actor.system.vida;
    await this.actor.update({ 'system.vida.value': descanso(v.value, v.max) });
  }

  static async #rolar(evento, alvo) {
    const item = this.actor.items.get(alvo.dataset.itemId);
    if (!item) return;
    const { rolarGolpe } = await import('../rolagem.mjs');
    await rolarGolpe(this.actor, item);
  }
}
