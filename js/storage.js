/**
 * localStorage persistence for the application form.
 * Files are never persisted; only string fields are.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'surelm-form-data';

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      // Drop file references if any somehow got stored.
      delete parsed.resume;
      delete parsed.other;
      return parsed;
    } catch (err) {
      console.error('Failed to load saved form data:', err);
      return null;
    }
  }

  function save(data) {
    try {
      var toStore = {};
      var field;
      for (field in data) {
        if (Object.prototype.hasOwnProperty.call(data, field) && typeof data[field] === 'string') {
          toStore[field] = data[field];
        }
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (err) {
      console.error('Failed to save form data:', err);
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear form data:', err);
    }
  }

  window.SureLMStorage = {
    load: load,
    save: save,
    clear: clear,
  };
})();
