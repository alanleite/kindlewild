import { canUse, isUnlimited, damageFormula, targetReference } from './rules.mjs';

export async function rollMove(actor, item) {
  const m = item.system;
  const use = canUse(m);
  if (!use.ok) {
    const key = use.reason === 'no-charges' ? 'KINDLEWILD.Warning.NoCharges' : 'KINDLEWILD.Warning.Locked';
    ui.notifications.warn(game.i18n.format(key, { name: item.name }));
    return null;
  }
  if (!isUnlimited(m)) await item.update({ 'system.charges.value': m.charges.value - 1 });

  const rolls = [];
  let hit = null;
  let damage = null;
  const formula = damageFormula(m, actor.system.attributes);
  if (formula) {
    hit = await new Roll('1d10').evaluate();
    damage = await new Roll(formula).evaluate();
    rolls.push(hit, damage);
  }

  const targetToken = game.user.targets.first();
  const ref = targetReference(targetToken?.actor?.type === 'creature' ? targetToken.actor.system : null, m.element);

  const content = await foundry.applications.handlebars.renderTemplate('systems/kindlewild/templates/chat-move.hbs', {
    attacker: actor.name, move: item.name, sys: m,
    hit: hit?.total ?? null, damage: damage?.total ?? null, formula,
    target: targetToken?.name ?? null, ref
  });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls });
}
