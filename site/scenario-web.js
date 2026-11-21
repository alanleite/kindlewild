/* Picks where the site reads the creatures from. Order: ?data=<file> (fixtures), ?scenario=<id>,
   and finally the default scenario from scenarios/default.txt. Images (the creature's `image`) are
   relative to the folder of the data file. See lib/scenario.js (same convention in Node). */
(function () {
  'use strict';

  var SCENARIOS_DIR = '../scenarios/';

  async function defaultScenario() {
    var response = await fetch(SCENARIOS_DIR + 'default.txt', { cache: 'no-store' });
    if (!response.ok) throw new Error('No scenario selected: use ?scenario=<id> or create scenarios/default.txt.');
    return (await response.text()).trim();
  }

  async function dataSource() {
    var params = new URL(location.href).searchParams;
    var url = params.get('data');
    if (!url) url = SCENARIOS_DIR + (params.get('scenario') || await defaultScenario()) + '/creatures.json';
    return { url: url, imagePrefix: new URL('.', new URL(url, location.href)).href };
  }

  window.ScenarioWeb = Object.freeze({ dataSource: dataSource });
})();
