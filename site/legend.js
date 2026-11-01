/* Card legend (site/legend.html). Page for the adult: text allowed.
   Fills the icons marked with data-group/data-name, the type grid and the type
   effects chart from the same species list the card uses. */
(function () {
  'use strict';

  var TYPES = [
    ['normal', 'Normal'], ['fire', 'Fire'], ['water', 'Water'], ['electric', 'Electric'],
    ['plant', 'Plant'], ['ice', 'Ice'], ['fighter', 'Fighter'], ['poison', 'Poison'],
    ['earth', 'Earth'], ['air', 'Air'], ['psychic', 'Psychic'], ['insect', 'Insect'],
    ['stone', 'Stone'], ['ghost', 'Ghost'], ['dragon', 'Dragon']
  ];

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function fillIcons() {
    document.querySelectorAll('.icon[data-group]').forEach(function (span) {
      span.innerHTML = window.ICONS.get(span.getAttribute('data-group'), span.getAttribute('data-name'));
    });
  }

  function buildTypes() {
    var grid = document.getElementById('type-grid');
    TYPES.forEach(function (t) {
      var item = el('div', 'legend-item');
      var disc = el('span', 'type-disc');
      disc.style.setProperty('--type-color', 'var(--type-' + t[0] + ')');
      var icon = el('span', 'icon');
      icon.innerHTML = window.ICONS.get('type', t[0]);
      disc.append(icon);
      var text = el('span');
      text.append(document.createTextNode(t[1]));
      item.append(disc, text);
      grid.append(item);
    });
  }

  // Chart: all resistances of each species (resistances field), by effect.
  // Same order as the card: vulnerable, immune, resistant.
  var EFFECTS = ['vulnerable', 'immune', 'resistant'];

  function chart(species) {
    var body = document.getElementById('chart-body');
    body.textContent = '';
    species.forEach(function (p) {
      var row = el('tr');
      row.append(el('td', 'name-col', p.name || ''));
      var groups = { immune: [], vulnerable: [], resistant: [] };
      Object.keys(p.resistances || {}).forEach(function (type) {
        var effect = p.resistances[type];
        if (groups[effect]) groups[effect].push(type);
      });
      EFFECTS.forEach(function (effect) {
        var td = el('td');
        var list = el('div', 'effect-list');
        (groups[effect] || []).forEach(function (type) {
          var label = TYPES.filter(function (t) { return t[0] === type; })[0];
          list.append(el('span', null, label ? label[1] : type));
        });
        td.append(list);
        row.append(td);
      });
      body.append(row);
    });
  }

  async function start() {
    fillIcons();
    buildTypes();
    var url = '';
    var status = document.getElementById('chart-status');
    try {
      url = (await ScenarioWeb.dataSource()).url;
      var response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('error ' + response.status);
      var species = await response.json();
      chart(Array.isArray(species) ? species : []);
      status.textContent = species.length + ' creatures in ' + url + '.';
    } catch (e) {
      status.textContent = 'Could not read ' + url + ' (' + e.message + '). See site/README.md on how to serve the folder.';
    }
  }

  start();
})();
