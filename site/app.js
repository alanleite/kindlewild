/* Kindlewild cards: reads the scenario's creature list and builds the A4 sheets (4 A6 cards per sheet).
   Each group of 4 cards produces two sheets: front (name, image, types, health, attributes,
   moves, resistances) and back (only the 70-box track).
   No framework and no build. Icons in icons.js. Visual rules in docs/design-system.md.
   See site/README.md. */
(function () {
  'use strict';

  var PER_PAGE = 4;            // cards per A4 sheet
  var TRACK_CONFIG = PrintSelection.trackConfig();
  var MOVES = 4;
  var HEARTS_PER_ROW = 12;
  var MAX_HEALTH = 24;
  // Where data and images come from: see scenario-web.js (?data=, ?scenario= or scenarios/default.txt).
  // The `image` field is relative to the folder of the data file ("images/025.png").
  var imagePrefix = '';
  var selectionSource = '';

  function saveSelection() {
    try { PrintSelection.save(window.localStorage, selectionSource, state.selectedIds); } catch (_) { /* Storage can be disabled. */ }
  }
  // Front and back go on separate sheets. The PrintSelection module groups only
  // the checked cards and mirrors the back columns for long-edge printing.

  var ATTRIBUTE_ORDER = ['strength', 'energy', 'agility', 'defense'];
  var KNOWN_TYPES = ['normal', 'fire', 'water', 'electric', 'plant', 'ice', 'fighter', 'poison',
    'earth', 'air', 'psychic', 'insect', 'stone', 'ghost', 'dragon'];

  var state = {
    species: [],
    selectedIds: new Set(),
    unlockedSkills: 1,
    stages: {},       // name -> stage (1 to 3), from the evolution chain
    previous: {},     // name -> name of the previous form (evolved forms only)
    outOfRule: []     // rule warnings (track, moves, profile)
  };

  // ---------------------------------------------------------------- utilities

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  // Icon (SVG) from a group of the map in icons.js. Unknown key becomes the placeholder.
  function icon(group, name, className) {
    var span = el('span', 'icon' + (className ? ' ' + className : ''));
    span.innerHTML = window.ICONS.get(group, name);
    return span;
  }

  function typeColor(type) {
    return KNOWN_TYPES.indexOf(type) >= 0 ? 'var(--type-' + type + ')' : 'var(--type-default)';
  }

  function imageUrl(file) {
    if (!file) return null;
    try { return new URL(file, imagePrefix).href; } catch (_) { return null; }
  }

  function integer(value, min) {
    return Math.max(min, Math.floor(Number(value) || 0));
  }

  function evolutionList(p) {
    if (Array.isArray(p.evolutions)) return p.evolutions;
    return p.evolutions ? [p.evolutions] : [];
  }

  function message(text) {
    var box = document.getElementById('message');
    box.textContent = text;
    box.hidden = false;
  }

  function hideMessage() {
    document.getElementById('message').hidden = true;
  }

  // ---------------------------------------------------------------- data

  async function loadData(url) {
    var response;
    try {
      response = await fetch(url, { cache: 'no-store' });
    } catch (e) {
      throw new Error('Could not load the database. Check the URL and network, and ensure the server allows cross-origin requests (CORS). If using file://, serve the site over HTTP instead.');
    }
    if (!response.ok) {
      throw new Error('The file ' + url + ' was not found (error ' + response.status + ').');
    }
    var data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('The file ' + url + ' is not valid JSON: ' + e.message);
    }
    if (!Array.isArray(data)) {
      throw new Error('The file ' + url + ' must be a list (array) of creatures.');
    }
    var ids = new Set();
    data.forEach(function (creature) {
      if (!creature || !Number.isInteger(creature.id) || ids.has(creature.id) || typeof creature.name !== 'string' || !Array.isArray(creature.moves) || !Array.isArray(creature.track) || !Array.isArray(creature.types)) {
        throw new Error('Invalid creature data: each entry needs a unique numeric id, name, types, moves and track. See docs/schema.md.');
      }
      ids.add(creature.id);
    });
    return data;
  }

  // Stage (1 to 3) and previous form, from the evolution chain of the list.
  function computeChain(species) {
    var parent = {};
    species.forEach(function (p) {
      evolutionList(p).forEach(function (e) {
        if (e && e.into) parent[e.into] = p.name;
      });
    });
    var stages = {};
    function stageOf(name, guard) {
      if (stages[name]) return stages[name];
      if (!parent[name] || guard > 5) return 1;
      return Math.min(3, stageOf(parent[name], guard + 1) + 1);
    }
    species.forEach(function (p) {
      stages[p.name] = stageOf(p.name, 0);
    });
    state.stages = stages;
    state.previous = parent;
  }

  // Evolved forms need room for inherited values and further growth; fall back to stage sizes
  // only when the scenario does not include their previous forms.
  function derivedSlots(p, attribute) {
    var inherited = CardView.inheritedSlots(p, state.species, attribute);
    if (inherited !== null) return inherited;
    var hasEvolution = evolutionList(p).length > 0;
    var hasPrevious = !!state.previous[p.name];
    if (hasPrevious) return hasEvolution ? 3 : 4;
    return hasEvolution ? 2 : 4;
  }

  // Attributes of the form to draw. An evolved form (attributes null) gets base 0 and
  // "inherited" = true: the boxes come out empty, because the value is inherited on evolution.
  function formAttributes(p) {
    var out = {};
    ATTRIBUTE_ORDER.forEach(function (key) {
      var a = p.attributes && p.attributes[key] ? p.attributes[key] : null;
      if (a) {
        out[key] = { base: Math.max(0, Number(a.base) || 0), slots: integer(a.slots, 0), inherited: false };
      } else {
        out[key] = { base: 0, slots: derivedSlots(p, key), inherited: true };
      }
    });
    return out;
  }

  function signature(p) {
    var dice = (p.moves || []).map(function (m) { return m.die + '/' + (m.effect || '') + '/' + (m.area ? 'a' : ''); }).join(',');
    var attr = ATTRIBUTE_ORDER.map(function (k) {
      var a = p.attributes && p.attributes[k];
      return a ? Number(a.base) + '/' + Number(a.slots) : 'inherits';
    }).join(',');
    return dice + '|' + attr;
  }

  // Checks the card against section 4 (track) and section 2 (dice), and criterion 5 (profile).
  function validateCard(p, byName) {
    var problems = PrintSelection.validateTrackStructure(p);

    var moves = p.moves || [];
    if (moves.length !== MOVES) problems.push(moves.length + ' moves (expected ' + MOVES + ')');
    if (integer(p.health, 0) + (p.track || []).filter(function (m) { return m.kind === 'heart'; }).length > MAX_HEALTH) problems.push('health and track hearts exceed ' + MAX_HEALTH);
    moves.map(CardView.normalizeMove).forEach(function (m) {
      CardView.moveProblems(m).forEach(function (msg) { problems.push('move ' + msg); });
    });

    var previous = byName[state.previous[p.name]];
    if (previous && signature(previous) === signature(p)) {
      problems.push('same dice and attribute profile as the previous form');
    }
    return problems;
  }

  // ---------------------------------------------------------------- card: front

  // Move die: plain text notation (d4, d6, d8 or d12). Support (die null) has no die.
  function buildDie(m) {
    var box = el('span', 'move-die');
    var label = CardView.dieLabel(m.die);
    if (label) box.textContent = label;
    else if (m.die !== null) console.warn(m.name + ': die ' + m.die + ' is not valid (d4, d6, d8 or d12).');
    return box;
  }

  // Attribute added to the die: "+" and the attribute icon (Strength or Energy). Support has none.
  function buildSum(m) {
    var sum = el('span', 'move-sum');
    if (m.die === null) return sum;
    if (m.attribute !== 'strength' && m.attribute !== 'energy') {
      console.warn(m.name + ': attribute ' + m.attribute + ' (strength or energy).');
      return sum;
    }
    sum.append(icon('symbol', 'plus', 'move-plus'), icon('attribute', m.attribute, 'move-attribute'));
    return sum;
  }

  function buildChips(p, effect) {
    var box = el('div', 'chips ' + effect);
    var map = Resistances.normalize(p.resistances);
    box.setAttribute('aria-label', effect === 'resistant' ? 'Resistant: half damage' : 'Vulnerable: double damage');
    box.append(el('span', 'chips-label', effect === 'resistant' ? '½' : '×2'));
    Object.keys(map).filter(function (type) { return map[type] === effect; }).forEach(function (type) {
      var chip = el('span', 'chip');
      chip.setAttribute('aria-label', type + ': ' + effect);
      var disc = el('span', 'type-disc');
      disc.style.setProperty('--type-color', typeColor(type));
      disc.append(icon('type', type));
      chip.append(disc);
      box.append(chip);
    });
    return box;
  }

  function buildFront(p, unlocked) {
    var card = el('article', 'card front');
    card.setAttribute('aria-label', p.name || 'Creature');
    var main = (p.types || []).filter(Boolean)[0] || 'normal';
    card.style.setProperty('--main-type-color', typeColor(main));

    // 1. top: image (40% of the card height), with the name band over it
    var top = el('div', 'top');
    var image = el('div', 'image');
    var src = imageUrl(p.image);
    if (src) {
      var img = el('img');
      img.alt = '';
      img.src = src;
      img.style.setProperty('--image-scale', ImageScale.get(p));
      img.addEventListener('error', function () {
        this.replaceWith(el('span', 'missing'));
      });
      image.append(img);
    } else {
      image.append(el('span', 'missing'));
    }
    var name = el('h2', 'name', p.name || '');
    var headerTypes = el('div', 'header-types');
    var visibleTypes = CardView.headerTypes(p.types);
    headerTypes.setAttribute('aria-label', 'Types: ' + visibleTypes.join(', '));
    visibleTypes.forEach(function (t) {
      var disc = el('span', 'type-disc');
      disc.style.setProperty('--type-color', typeColor(t));
      disc.append(icon('type', t));
      headerTypes.append(disc);
    });
    var stage = state.stages[p.name] || 1;
    var pips = el('div', 'stage');
    pips.setAttribute('aria-label', 'Stage ' + stage);
    for (var s = 1; s <= 3; s++) {
      pips.append(el('span', 'pip' + (s <= stage ? '' : ' empty')));
    }
    var resistant = buildChips(p, 'resistant');
    var vulnerable = buildChips(p, 'vulnerable');
    top.append(image, name, headerTypes, pips, resistant, vulnerable);

    var body = el('div', 'card-body');

    // 2. row: filled starting hearts and outlined future track hearts.
    var row = el('div', 'health-row');
    var health = integer(p.health, 0);
    var hearts = el('div', 'hearts');
    var futureHearts = (p.track || []).filter(function (m) { return m.kind === 'heart'; }).length;
    hearts.setAttribute('aria-label', 'Starting health ' + health + ', ' + futureHearts + ' unlockable hearts');
    for (var i = 0; i < Math.min(health + futureHearts, MAX_HEALTH); i++) {
      hearts.append(icon('general', 'heart', 'heart' + (i >= health ? ' future' : '')));
    }
    if (health + futureHearts > MAX_HEALTH) console.warn(p.name + ': total hearts exceed ' + MAX_HEALTH + '.');
    row.append(hearts);

    // 3. attributes: one column per attribute, icon and boxes (no number).
    // Evolved form: empty boxes (inherited). Base form: boxes filled by the base.
    var attributes = el('div', 'attributes');
    var values = formAttributes(p);
    ATTRIBUTE_ORDER.forEach(function (key) {
      var a = values[key];
      var column = el('div', 'attribute' + (a.inherited ? ' inherited' : ''));
      column.append(icon('attribute', key, 'attribute-icon'));
      var boxes = el('div', 'boxes');
      var filled = Math.min(a.base, a.slots);
      for (var j = 0; j < a.slots; j++) {
        var box = el('span', 'box');
        if (j < filled) box.classList.add('filled');
        boxes.append(box);
      }
      column.append(boxes);
      attributes.append(column);
    });

    // 4. moves: unlock square (empty or checked), icon, name, die and charge dots
    var moves = el('div', 'moves');
    (p.moves || []).slice(0, MOVES).map(CardView.normalizeMove).forEach(function (m, idx) {
      var isUnlocked = idx < unlocked;
      var moveRow = el('div', 'move' + (isUnlocked ? '' : ' locked'));
      var check = el('span', 'move-check');
      if (isUnlocked) check.append(icon('general', 'checked', 'check-icon'));
      var box = el('span', 'move-box');
      box.style.setProperty('--move-type-color', typeColor(m.element));
      // charges: 3, 2 or 1 dots; unlimited (null) without dots
      var uses = el('span', 'move-charges');
      var charges = CardView.moveProblems(m).length ? 0 : integer(m.charges, 0);
      for (var k = 0; k < Math.min(charges, 3); k++) uses.append(el('span', 'dot'));
      var effect = el('span', 'move-effect');
      if (m.effect) effect.append(icon('effect', m.effect, 'move-effect-icon'));
      var area = el('span', 'move-area');
      if (m.area) area.append(icon('general', 'area', 'move-area-icon'));
      // Use the same colored type disc as the resistance and vulnerability lists.
      var moveType = el('span', 'type-disc move-element');
      moveType.style.setProperty('--type-color', typeColor(m.element || 'normal'));
      moveType.setAttribute('aria-label', 'Element: ' + (m.element || 'normal'));
      moveType.append(icon('type', m.element || 'normal'));
      box.append(
        moveType,
        el('span', 'move-name', m.name),
        buildDie(m),
        buildSum(m),
        effect,
        area,
        uses
      );
      moveRow.append(check, box);
      moves.append(moveRow);
    });

    body.append(row, attributes, moves);
    card.append(top, body);
    return card;
  }

  // ---------------------------------------------------------------- card: back

   // Back: the 70-box track and a small name for identifying the card.
  function buildBack(p) {
    var card = el('article', 'card back');
    card.setAttribute('aria-label', 'Back of ' + (p.name || 'creature'));

    var marks = new Map();
    (p.track || []).forEach(function (m) { marks.set(Number(m.pos), m); });
    var start = integer(p.start, 1) || 1;
    var evolutions = evolutionList(p);

    var track = el('div', 'track');
    TRACK_CONFIG.positions.forEach(function (pos) {
      var square = el('span', 'track-box');
      if (pos === start) square.classList.add('next');
      var m = marks.get(pos);
      if (m) {
        square.classList.add(m.kind);
        square.append(icon('track', m.kind, 'track-icon'));
        var evo = evolutions.find(function (e) { return Number(e.pos) === pos && e.requires; });
        if (evo) square.append(icon('general', 'item', 'item-icon'));
      }
      track.append(square);
    });
    card.append(track, el('span', 'back-name', p.name || ''));
    return card;
  }

  // ---------------------------------------------------------------- sheets

  function buildSheet(number, group, side, unlocked) {
    var sheet = el('section', 'page sheet-' + side);
    sheet.id = 'sheet-' + number + '-' + side;
    sheet.setAttribute('aria-label', 'Sheet ' + number + ', ' + (side === 'front' ? 'front' : 'back'));
    var cards = side === 'back' ? PrintSelection.mirrorBack(group) : group;
    for (var i = 0; i < PER_PAGE; i++) {
      var slot = el('div', 'slot');
      var card = cards[i];
      if (card) {
        slot.append(side === 'front' ? buildFront(card, unlocked) : buildBack(card));
      }
      sheet.append(slot);
    }
    return sheet;
  }

  function render() {
    var species = PrintSelection.filter(state.species, state.selectedIds);
    var groups = PrintSelection.group(species, PER_PAGE);

    var place = document.getElementById('pages');
    place.textContent = '';
    groups.forEach(function (group, idx) {
      var n = idx + 1;
      place.append(el('p', 'sheet-label', 'Sheet ' + n + ' · front'));
      place.append(buildSheet(n, group, 'front', state.unlockedSkills));
      place.append(el('p', 'sheet-label', 'Sheet ' + n + ' · back (prints on the other side of this sheet)'));
      place.append(buildSheet(n, group, 'back', state.unlockedSkills));
    });

    // sheet selector
    var selector = document.getElementById('sheet-select');
    var chosen = selector.value;
    selector.textContent = '';
    groups.forEach(function (group, idx) {
      var names = group.map(function (p) { return p.name; }).join(', ');
      if (names.length > 50) names = names.slice(0, 47) + '…';
      var option = el('option', null, 'Sheet ' + (idx + 1) + ': ' + names);
      option.value = String(idx + 1);
      selector.append(option);
    });
    if (chosen && selector.querySelector('option[value="' + chosen + '"]')) {
      selector.value = chosen;
    }
    selector.disabled = groups.length === 0;

    var summary = PrintSelection.summarize(species.length, state.species.length, PER_PAGE);
    document.getElementById('summary').textContent = summary.text;
    document.getElementById('selection-summary').textContent = summary.selection;
    document.getElementById('print-button').disabled = summary.printDisabled;

    var warning = document.getElementById('track-warning');
    if (state.outOfRule.length) {
      warning.textContent = state.outOfRule.length + (state.outOfRule.length === 1 ? ' card' : ' cards') + ' out of rule';
      warning.title = state.outOfRule.join('\n');
      warning.hidden = false;
    } else {
      warning.hidden = true;
    }
  }

  function buildCreaturePicker() {
    var list = document.getElementById('creature-list');
    list.textContent = '';
    state.species.forEach(function (p) {
      var label = el('label', 'creature-option');
      label.dataset.id = String(p.id);
      label.dataset.name = p.name;
      var box = el('input');
      box.type = 'checkbox';
      box.value = String(p.id);
      box.checked = state.selectedIds.has(Number(p.id));
      var number = el('span', 'creature-number', '#' + String(p.id).padStart(3, '0'));
      label.append(box, number, el('span', 'creature-name', p.name));
      list.append(label);
    });
  }

  function updateCheckboxes() {
    document.querySelectorAll('#creature-list input[type="checkbox"]').forEach(function (box) {
      box.checked = state.selectedIds.has(Number(box.value));
    });
  }

  function bindControls() {
    var dataUrl = document.getElementById('data-url');
    var currentData = new URL(location.href).searchParams.get('data');
    if (currentData && /^https:\/\//i.test(currentData)) dataUrl.value = currentData;
    document.getElementById('data-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var source;
      try { source = new URL(dataUrl.value.trim()); } catch (_) { message('Enter a valid HTTPS database URL.'); return; }
      if (source.protocol !== 'https:' || source.username || source.password) { message('Use an HTTPS URL without a username or password.'); return; }
      var page = new URL(location.href);
      page.searchParams.delete('scenario');
      page.searchParams.set('data', source.href);
      location.assign(page.href);
    });
    document.getElementById('reset-data').addEventListener('click', function () {
      try { localStorage.removeItem('kindlewild.database.v1'); } catch (_) { /* Storage can be disabled. */ }
      var page = new URL(location.href);
      page.searchParams.delete('data');
      page.searchParams.delete('scenario');
      location.assign(page.href);
    });
    var sheetSelect = document.getElementById('sheet-select');
    sheetSelect.addEventListener('change', function () {
      var target = document.getElementById('sheet-' + sheetSelect.value + '-front');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    var skillsSelect = document.getElementById('skills-select');
    skillsSelect.value = String(state.unlockedSkills);
    skillsSelect.addEventListener('change', function () {
      state.unlockedSkills = Number(skillsSelect.value) || 1;
      render();
    });

    document.getElementById('print-button').addEventListener('click', function () {
      window.print();
    });

    document.getElementById('creature-list').addEventListener('change', function (event) {
      if (!event.target.matches('input[type="checkbox"]')) return;
      var id = Number(event.target.value);
      if (event.target.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      saveSelection();
      render();
    });

    document.getElementById('creature-search').addEventListener('input', function (event) {
      var search = event.target.value;
      document.querySelectorAll('.creature-option').forEach(function (option) {
        option.hidden = !PrintSelection.matchesSearch(
          { id: Number(option.dataset.id), name: option.dataset.name },
          search
        );
      });
    });

    document.getElementById('select-all').addEventListener('click', function () {
      state.selectedIds = PrintSelection.selectAll(state.species);
      saveSelection();
      updateCheckboxes();
      render();
    });

    document.getElementById('clear-selection').addEventListener('click', function () {
      state.selectedIds.clear();
      saveSelection();
      updateCheckboxes();
      render();
    });
  }

  function checkCards(species) {
    state.outOfRule = [];
    var byName = {};
    species.forEach(function (p) { byName[p.name] = p; });
    species.forEach(function (p) {
      var problems = validateCard(p, byName);
      if (problems.length) {
        var line = p.name + ': ' + problems.join('; ');
        state.outOfRule.push(line);
        console.warn('Card out of rule -> ' + line);
      }
    });
  }

  async function start() {
    var url = '';
    bindControls();
    try {
      var source = await ScenarioWeb.dataSource();
      var params = new URL(location.href).searchParams;
      if (!params.has('data') && !params.has('scenario')) {
        try {
          var remembered = localStorage.getItem('kindlewild.database.v1');
          if (remembered && new URL(remembered).protocol === 'https:') source = { url: remembered, imagePrefix: new URL('.', remembered).href };
        } catch (_) { /* Use the default scenario. */ }
      }
      url = source.url;
      var legendUrl = new URL('legend.html', location.href);
      legendUrl.searchParams.set('data', new URL(url, location.href).href);
      document.querySelector('.links a').href = legendUrl.href;
      imagePrefix = source.imagePrefix;
      var species = await loadData(url);
      if (!species.length) {
        message('The file ' + url + ' has no creatures yet.');
        return;
      }
      state.species = species;
      selectionSource = new URL(url, location.href).href;
      try { state.selectedIds = PrintSelection.restore(window.localStorage, selectionSource, species); }
      catch (_) { state.selectedIds = PrintSelection.selectAll(species); }
      if (/^https:\/\//i.test(url) && (params.has('data') || !params.has('scenario'))) {
        document.getElementById('data-url').value = url;
        try { localStorage.setItem('kindlewild.database.v1', url); } catch (_) { /* Storage can be disabled. */ }
      }
      computeChain(species);
      checkCards(species);
      hideMessage();
      buildCreaturePicker();
      render();
      document.getElementById('select-all').disabled = false;
      document.getElementById('clear-selection').disabled = false;
    } catch (e) {
      message(e.message);
      document.getElementById('summary').textContent = '';
    }
  }

  start();
})();
