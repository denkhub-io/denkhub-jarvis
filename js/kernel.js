/*
 * Jarvis kernel: the global namespace and the app registry.
 * Loads before any app file. Each app calls Jarvis.registerApp({...})
 * at script evaluation time, so by the time the desktop boots every
 * app is already registered.
 */
window.Jarvis = (function () {
  const apps = new Map();

  function registerApp(def) {
    if (!def || !def.id) {
      console.warn('[Jarvis] app missing id', def);
      return;
    }
    if (apps.has(def.id)) {
      console.warn('[Jarvis] duplicate app id:', def.id);
      return;
    }
    if (typeof def.mount !== 'function') {
      console.warn('[Jarvis] app has no mount():', def.id);
      return;
    }
    def.defaultSize = def.defaultSize || { width: 320, height: 240 };
    def.showInDock = def.showInDock !== false;
    def.allowMultiple = def.allowMultiple !== false;
    apps.set(def.id, def);
  }

  function getApp(id) { return apps.get(id) || null; }
  function listApps() { return Array.from(apps.values()); }
  function dockApps() { return listApps().filter(a => a.showInDock); }

  return { registerApp, getApp, listApps, dockApps };
})();
