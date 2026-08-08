/**
 * Referral detection from the URL pathname.
 * Keeps the same behavior as the original React app:
 *   /soham  -> "Soham Suryavanshi"
 *   /saksham -> "Saksham Tripathi"
 *   /harsh  -> "Harsh Srivastava"
 *   /harshit -> "Harshit Rana"
 * Any other path returns null (no referral).
 */
(function () {
  'use strict';

  var VALID_REFERRALS = {
    soham: 'Soham Suryavanshi',
    saksham: 'Saksham Tripathi',
    harsh: 'Harsh Srivastava',
    harshit: 'Harshit Rana',
  };

  var IGNORED_PATH_SEGMENTS = [
    'assets',
    'index.html',
    'thank-you.html',
    'favicon.svg',
    'icons.svg',
    'fonts.css',
    'css',
    'js',
  ];

  function getReferrer() {
    var path = window.location.pathname;
    var segments = path.split('/').filter(Boolean);

    if (segments.length === 0) return null;

    var slug = segments[0].toLowerCase();

    if (IGNORED_PATH_SEGMENTS.indexOf(slug) !== -1) return null;

    return VALID_REFERRALS[slug] || null;
  }

  window.SureLMReferral = {
    getReferrer: getReferrer,
    getReferrerName: function () {
      return getReferrer();
    },
  };
})();
