(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ImageScale = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Conservative normalization by the visible pixel area of each PNG: the factor comes from the
  // creature's `image_scale` field (set by the scenario; default 1). The 1.18 cap avoids noticeable
  // cropping at the edges of the art.
  var CAP = 1.18;

  function get(creature) {
    var f = Number(creature && creature.image_scale);
    if (!(f > 0)) return 1;
    return Math.min(f, CAP);
  }

  return Object.freeze({ get: get, cap: CAP });
});
