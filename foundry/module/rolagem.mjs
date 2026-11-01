import { podeUsar, ehIlimitado, formulaDano, referenciaAlvo } from './regras.mjs';

export async function rolarGolpe(actor, item) {
  const g = item.system;
  const uso = podeUsar(g);
  if (!uso.ok) {
    const chave = uso.motivo === 'sem-carga' ? 'KINDLEWILD.Aviso.SemCarga' : 'KINDLEWILD.Aviso.Bloqueado';
    ui.notifications.warn(game.i18n.format(chave, { nome: item.name }));
    return null;
  }
  if (!ehIlimitado(g)) await item.update({ 'system.cargas.valor': g.cargas.valor - 1 });

  const rolls = [];
  let acerto = null;
  let dano = null;
  const formula = formulaDano(g, actor.system.atributos);
  if (formula) {
    acerto = await new Roll('1d10').evaluate();
    dano = await new Roll(formula).evaluate();
    rolls.push(acerto, dano);
  }

  const alvoToken = game.user.targets.first();
  const ref = referenciaAlvo(alvoToken?.actor?.type === 'criatura' ? alvoToken.actor.system : null, g.elemento);

  const conteudo = await foundry.applications.handlebars.renderTemplate('systems/kindlewild/templates/chat-golpe.hbs', {
    atacante: actor.name, golpe: item.name, sys: g,
    acerto: acerto?.total ?? null, dano: dano?.total ?? null, formula,
    alvo: alvoToken?.name ?? null, ref
  });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: conteudo, rolls });
}
