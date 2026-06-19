/*
 * Clapper, in the browser. Listens to the microphone and opens a chosen set
 * of apps, tiled into a grid, on a double clap. It is the web port of the
 * denkhub-io/clapper project and uses the same detection logic: a clap is a
 * short loud burst (RMS over a threshold), two of them within a window
 * trigger the layout. Everything is configurable from the Settings app.
 */
const Clapper = (() => {
  const STORE_KEY = 'jarvis:clapper';
  const DEFAULTS = {
    enabled: false,
    apps: ['clock', 'notes', 'ai'],
    threshold: 0.10,
    debounceMs: 80,
    doubleWindowMs: 1200
  };

  let config = { ...DEFAULTS };
  let audioCtx = null;
  let analyser = null;
  let stream = null;
  let buffer = null;
  let rafId = null;
  let active = false;

  let lastClap = 0;
  let clapCount = 0;
  let onClapCb = null;
  let onLevelCb = null;

  function _load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) Object.assign(config, JSON.parse(raw));
    } catch (e) {
      console.warn('[clapper] could not load config', e);
    }
  }

  function _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('[clapper] could not save config', e);
    }
  }

  function init() {
    _load();
  }

  function getConfig() { return { ...config }; }

  function setConfig(patch) {
    Object.assign(config, patch);
    _save();
    if (config.enabled && !active) start();
    else if (!config.enabled && active) stop();
  }

  function onClap(cb) { onClapCb = cb; }
  function onLevel(cb) { onLevelCb = cb; }

  async function start() {
    if (active) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      buffer = new Float32Array(analyser.fftSize);
      active = true;
      config.enabled = true;
      _save();
      _loop();
      return true;
    } catch (e) {
      console.error('[clapper] mic access failed', e);
      active = false;
      return false;
    }
  }

  function stop() {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    config.enabled = false;
    _save();
  }

  function _loop() {
    if (!active || !analyser) return;
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);
    if (onLevelCb) onLevelCb(rms);

    const now = performance.now();
    if (rms > config.threshold && (now - lastClap) >= config.debounceMs) {
      const gap = now - lastClap;
      lastClap = now;
      clapCount = gap <= config.doubleWindowMs ? clapCount + 1 : 1;
      if (clapCount >= 2) {
        clapCount = 0;
        _trigger();
      }
    }
    rafId = requestAnimationFrame(_loop);
  }

  function _trigger() {
    const apps = (config.apps || []).filter(id => Jarvis.getApp(id));
    if (apps.length === 0) {
      if (typeof Notifications !== 'undefined') {
        Notifications.show('Clapper: nessuna app configurata', { type: 'warn' });
      }
      return;
    }
    WindowManager.closeAllWindows();
    WindowManager.tileApps(apps);
    if (typeof Notifications !== 'undefined') {
      Notifications.show('Doppio clap. ' + apps.length + ' app aperte.', { type: 'info' });
    }
    if (onClapCb) onClapCb();
  }

  function isActive() { return active; }
  function trigger() { _trigger(); }

  return { init, start, stop, setConfig, getConfig, onClap, onLevel, isActive, trigger };
})();
