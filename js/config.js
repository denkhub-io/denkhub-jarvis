/*
 * Tunable constants for gesture interaction.
 * The Settings app edits these live and persists them to localStorage,
 * so values calibrate to the user's camera and framerate.
 */
const GestureConfig = (() => {
  const DEFAULTS = {
    oneEuroMinCutoff: 1.2,
    oneEuroBeta: 0.015,
    oneEuroDCutoff: 1.0,
    pinchFreezeMs: 140,

    dwellMs: 650,
    dwellMoveTolerancePx: 26,
    dwellCooldownMs: 500,
    dwellRearmExitPx: 40,
    dwellEnabled: true,

    pinchEnter: 0.045,
    pinchExit: 0.075,
    pinchDebounceMs: 120,
    grabHoldMs: 350,

    hitInflatePx: 12,
    snapRadiusPx: 140,
    snapStrength: 0.6,
    snapEnabled: true,

    minTargetPx: 44,
    minSpacingPx: 12,
    edgeMarginPx: 24
  };

  const STORE_KEY = 'jarvis:gesture-config';
  const state = { ...DEFAULTS };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) {
      console.warn('[config] could not load saved gesture config', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[config] could not save gesture config', e);
    }
  }

  function get(key) { return state[key]; }

  function set(key, value) {
    state[key] = value;
    save();
  }

  function reset() {
    Object.assign(state, DEFAULTS);
    save();
  }

  function all() { return { ...state }; }

  load();

  return { get, set, reset, all, DEFAULTS };
})();
