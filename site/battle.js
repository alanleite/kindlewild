(function () {
  'use strict';
  var DATABASE_KEY = 'kindlewild.database.v1';
  var BATTLE_KEY = 'kindlewild.battle.v1:';
  var attrs = ['strength', 'energy', 'agility', 'defense'];
  var effects = ['weakness', 'poison', 'paralysis', 'sleep', 'swift', 'shield', 'extra_strength', 'heal'];
  var species = [], fighters = [], source = '', imagePrefix = '';
  var $ = function (id) { return document.getElementById(id); };
  function node(tag, text, className) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (className) e.className = className;
    return e;
  }
  function button(label, action, className) {
    var e = node('button', label, className);
    e.type = 'button'; e.addEventListener('click', action); return e;
  }
  function save() {
    try { localStorage.setItem(BATTLE_KEY + source, JSON.stringify(fighters)); }
    catch (_) { $('message').textContent = 'Could not save this battle in the browser. Keep this tab open.'; }
  }
  function change(f, key, amount, min, max) {
    var wasFull = f.health === f.maxHealth;
    f[key] = Math.max(min, Math.min(max, f[key] + amount));
    if (key === 'maxHealth') f.health = wasFull ? f.maxHealth : Math.min(f.health, f.maxHealth);
    save(); renderBattle();
  }
  function add(c) {
    var values = {};
    attrs.forEach(function (a) { values[a] = Math.max(0, Number(c.attributes && c.attributes[a] && c.attributes[a].base) || 0); });
    var health = Math.max(1, Math.min(24, Number(c.health) || 1));
    fighters.push({ id: c.id, health: health, maxHealth: health, attrs: values, effects: [], charges: (c.moves || []).map(function (m) { var n = CardView.normalizeMove(m).charges; return n == null ? null : n; }) });
    save(); renderBattle();
  }
  function stepper(label, value, down, up) {
    var row = node('div', undefined, 'stat');
    row.append(node('span', label), button('−', down, 'secondary step'), node('output', String(value)), button('+', up, 'secondary step'));
    return row;
  }
  function renderBattle() {
    var list = $('battle'); list.replaceChildren();
    $('clear').disabled = !fighters.length; $('empty').hidden = !!fighters.length;
    fighters.forEach(function (f, index) {
      var c = species.find(function (s) { return s.id === f.id; });
      var card = node('article', undefined, 'creature');
      if (!c) { card.append(node('p', 'This creature is not in the current database.'), button('Remove', function () { fighters.splice(index, 1); save(); renderBattle(); }, 'secondary danger')); list.append(card); return; }
      var head = node('div', undefined, 'creature-head');
      if (c.image) { var img = node('img'); img.src = new URL(c.image, imagePrefix).href; img.alt = ''; head.append(img); }
      var heading = node('div'); heading.append(node('h3', c.name), node('p', '#' + c.id + ' · ' + (c.types || []).join(' / ')));
      head.append(heading, button('Remove', function () { fighters.splice(index, 1); save(); renderBattle(); }, 'secondary danger'));
      var hp = node('div', undefined, 'health');
      hp.append(node('strong', '♥ ' + f.health + ' / ' + f.maxHealth), button('−', function () { change(f, 'health', -1, 0, f.maxHealth); }, 'secondary step'), button('+', function () { change(f, 'health', 1, 0, f.maxHealth); }, 'secondary step'));
      var stats = node('div', undefined, 'stats');
      stats.append(stepper('Maximum health', f.maxHealth, function () { change(f, 'maxHealth', -1, 1, 24); }, function () { change(f, 'maxHealth', 1, 1, 24); }));
      attrs.forEach(function (a) {
        stats.append(stepper(a[0].toUpperCase() + a.slice(1), f.attrs[a], function () { f.attrs[a] = Math.max(0, f.attrs[a] - 1); save(); renderBattle(); }, function () { f.attrs[a] = Math.min(99, f.attrs[a] + 1); save(); renderBattle(); }));
      });
      card.append(head, hp, stats);
      if (c.inherits_attributes || !c.attributes) card.append(node('p', 'Evolved form: set inherited attributes manually.', 'hint'));
      card.append(node('p', 'Effective agility is capped at 8. Maximum health is capped at 24.', 'hint'));
      var types = Resistances.normalize(c.resistances), res = [], weak = [];
      Object.keys(types).forEach(function (t) { (types[t] === 'resistant' ? res : weak).push(t); });
      card.append(node('p', '−1: ' + (res.join(', ') || '—') + '  ·  +1: ' + (weak.join(', ') || '—')));
      var moves = node('details'); moves.open = true; moves.append(node('summary', 'Moves'));
      (c.moves || []).forEach(function (raw, i) {
        var m = CardView.normalizeMove(raw), row = node('div', undefined, 'move'), description = [m.element, m.die, m.attribute, m.effect, m.area ? 'area' : null].filter(Boolean).join(' · ');
        var text = node('div'); text.append(node('strong', m.name), node('p', description, 'hint')); row.append(text);
        if (m.charges != null && i !== 0) {
          var charge = node('div', undefined, 'health');
          charge.append(button('−', function () { f.charges[i] = Math.max(0, f.charges[i] - 1); save(); renderBattle(); }, 'secondary step'), node('span', String(f.charges[i]) + '/' + m.charges), button('+', function () { f.charges[i] = Math.min(m.charges, f.charges[i] + 1); save(); renderBattle(); }, 'secondary step')); row.append(charge);
        }
        moves.append(row);
      });
      card.append(moves);
      var status = node('details'); status.open = true; status.append(node('summary', 'Effects' + (f.effects.length ? ' (' + f.effects.length + ')' : '')));
      var buttons = node('div', undefined, 'effects');
      effects.forEach(function (effect) { var b = button(effect.replaceAll('_', ' '), function () { var at = f.effects.indexOf(effect); if (at < 0) f.effects.push(effect); else f.effects.splice(at, 1); save(); renderBattle(); }); b.setAttribute('aria-pressed', String(f.effects.includes(effect))); buttons.append(b); });
      status.append(buttons); card.append(status); list.append(card);
    });
  }
  function renderResults() {
    var q = $('search').value.trim().toLowerCase(), matches = species.filter(function (c) { return c.name.toLowerCase().includes(q) || String(c.id).includes(q.replace(/^#/, '')); });
    $('results').replaceChildren();
    matches.slice(0, 30).forEach(function (c) { $('results').append(button('#' + c.id + ' ' + c.name + ' +', function () { add(c); })); });
    if (matches.length > 30) $('results').append(node('p', 'Showing 30 results. Type to narrow the search.', 'hint'));
  }
  async function load(url) {
    var absolute = new URL(url, location.href).href, response = await fetch(absolute, { cache: 'no-store' });
    if (!response.ok) throw new Error('Database request failed (' + response.status + ').');
    var data = await response.json();
    if (!Array.isArray(data) || data.some(function (c) { return !c || !Number.isInteger(c.id) || typeof c.name !== 'string' || !Array.isArray(c.moves); })) throw new Error('Invalid creature database.');
    species = data; source = absolute; imagePrefix = new URL('.', absolute).href;
    fighters = [];
    try { var stored = JSON.parse(localStorage.getItem(BATTLE_KEY + source) || '[]'); if (Array.isArray(stored)) fighters = stored; localStorage.setItem(DATABASE_KEY, absolute); } catch (_) { $('message').textContent = 'Browser storage is unavailable.'; }
    $('database-url').value = absolute; $('search').disabled = false;
    $('message').textContent = species.length + ' creatures loaded. Battle changes stay in this browser.';
    renderResults(); renderBattle();
  }
  $('database-form').addEventListener('submit', function (e) { e.preventDefault(); load($('database-url').value).catch(function () { $('message').textContent = 'Could not load the database. Check the URL and CORS access.'; }); });
  $('search').addEventListener('input', renderResults);
  $('clear').addEventListener('click', function () { if (fighters.length && confirm('Clear all creatures from this battle?')) { fighters = []; save(); renderBattle(); } });
  (async function () {
    try {
      var params = new URL(location.href).searchParams, url = params.get('data');
      if (!url && !params.has('scenario')) { try { url = localStorage.getItem(DATABASE_KEY); } catch (_) {} }
      if (!url) url = (await ScenarioWeb.dataSource()).url;
      await load(url);
    } catch (_) { $('message').textContent = 'Could not load the database. Enter a public database URL above.'; }
  }());
}());
