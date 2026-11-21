(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PrintSelection = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function filter(species, selectedIds) {
    return species
      .filter(function (p) { return selectedIds.has(Number(p.id)); })
      .slice()
      .sort(function (a, b) { return Number(a.id) - Number(b.id); });
  }

  function matchesSearch(creature, term) {
    var search = String(term || '').trim().toLocaleLowerCase('pt-BR');
    if (!search) return true;
    if (/^#?\d+$/.test(search)) return Number(search.replace('#', '')) === Number(creature.id);
    return String(creature.name || '').toLocaleLowerCase('pt-BR').includes(search);
  }

  function selectAll(species) {
    return new Set(species.map(function (p) { return Number(p.id); }));
  }

  function restore(storage, source, species) {
    try {
      var saved = JSON.parse(storage.getItem('kindlewild.selection.v1:' + source));
      if (!Array.isArray(saved) || !saved.every(Number.isInteger)) return selectAll(species);
      var available = selectAll(species);
      return new Set(saved.filter(function (id) { return available.has(id); }));
    } catch (_) { return selectAll(species); }
  }

  function save(storage, source, selectedIds) {
    try { storage.setItem('kindlewild.selection.v1:' + source, JSON.stringify(Array.from(selectedIds))); return true; }
    catch (_) { return false; }
  }

  function summarize(count, total, perPage) {
    var sheets = count ? Math.ceil(count / perPage) : 0;
    return {
      sheets: sheets,
      printDisabled: count === 0,
      selection: count + ' of ' + total + ' selected',
      text: count + ' selected · ' +
        (sheets ? sheets + (sheets === 1 ? ' sheet' : ' sheets') + ' front and back' : 'no sheets')
    };
  }

  function group(cards, size) {
    var groups = [];
    for (var i = 0; i < cards.length; i += size) {
      groups.push(cards.slice(i, i + size));
    }
    return groups;
  }

  function mirrorBack(group) {
    return [group[1], group[0], group[3], group[2]];
  }

  function trackConfig() {
    return {
      size: 70,
      columns: 7,
      rows: 10,
      positions: Array.from({ length: 70 }, function (_, i) { return i + 1; })
    };
  }

  function validateTrackStructure(creature) {
    var size = trackConfig().size;
    var marks = creature.track || [];
    var positions = marks.map(function (m) { return Number(m.pos); });
    var problems = [];
    // Only repetition allowed: evolution marks at position 40 (stones and trade; species with several evolutions).
    var repeated = positions.some(function (pos, i) {
      return positions.indexOf(pos) !== i && !(pos === 40 && marks[i].kind === 'evolution' &&
        marks[positions.indexOf(pos)].kind === 'evolution');
    });
    if (repeated) problems.push('repeated position');
    if (positions.some(function (pos) { return pos < 1 || pos > size; })) {
      problems.push('mark outside positions 1 to ' + size);
    }
    for (var i = 1; i < positions.length; i++) {
      if (positions[i] < positions[i - 1]) {
        problems.push('marks out of order');
        break;
      }
    }
    return problems;
  }

  return {
    filter: filter,
    matchesSearch: matchesSearch,
    selectAll: selectAll,
    restore: restore,
    save: save,
    summarize: summarize,
    group: group,
    mirrorBack: mirrorBack,
    trackConfig: trackConfig,
    validateTrackStructure: validateTrackStructure
  };
}));
