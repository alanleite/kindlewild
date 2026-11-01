// Regras puras do Kindlewild. Sem dependência do Foundry: testadas com node --test.

export const VIDA_TETO = 16;
export const TRILHO = 70;
export const AGILIDADE_TETO = 8;

export function vidaMaxima(base, marcas, progresso) {
  const coracoes = marcas.filter((m) => m.tipo === 'coracao' && m.pos <= progresso).length;
  return Math.min(VIDA_TETO, base + coracoes);
}

export function descanso(valor, max) {
  return Math.min(max, valor + Math.ceil(max / 2));
}

export function proximoValorClique(atual, indice, max) {
  return indice <= atual ? indice - 1 : Math.min(max, indice);
}

export function ehIlimitado(golpe) {
  return golpe.ordem === 1 || golpe.cargas?.max == null;
}

export function podeUsar(golpe) {
  if (golpe.ordem !== 1 && !golpe.liberado) return { ok: false, motivo: 'bloqueado' };
  if (!ehIlimitado(golpe) && (golpe.cargas.valor ?? 0) <= 0) return { ok: false, motivo: 'sem-carga' };
  return { ok: true, motivo: null };
}

export function formulaDano(golpe, atributos) {
  if (!golpe.dado) return null;
  const bonus = golpe.atributo ? (atributos[golpe.atributo]?.estrelas ?? 0) : 0;
  return `1${golpe.dado} + ${bonus}`;
}

export function referenciaAlvo(alvo, elemento) {
  if (!alvo) return { agilidade: '—', defesa: '—', resistencia: '—' };
  const agi = Math.min(AGILIDADE_TETO, alvo.atributos?.agilidade?.estrelas ?? 0);
  const def = alvo.atributos?.defesa?.estrelas ?? 0;
  return { agilidade: String(agi), defesa: String(def), resistencia: alvo.resistencias?.[elemento] ?? '—' };
}

export function vidaAposProgresso(base, marcas, progresso, valorAtual) {
  return Math.min(valorAtual, vidaMaxima(base, marcas, progresso));
}
