/*
 * App dock at the bottom of the screen. It reads the registry, so any app
 * that registers itself shows up here with no extra wiring. Each icon is an
 * interactive target, so a dwell or a pinch opens it. Mouse uses the native
 * click handler.
 */
const HomeModule = (() => {
  let container = null;
  let onAppOpen = null;
  let lastOpened = null;

  function _esc(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function init(callback) {
    onAppOpen = callback;
    container = document.getElementById('app-dock');
    if (!container) return;

    Jarvis.dockApps().forEach((app) => {
      const el = document.createElement('div');
      el.className = 'dock-app';
      el.dataset.appId = app.id;
      el.innerHTML =
        `<div class="dock-app-icon">${app.icon}</div>` +
        `<div class="dock-app-label">${_esc(app.name)}</div>`;
      el.addEventListener('click', () => open(app.id));
      container.appendChild(el);

      InteractiveRegistry.register({
        id: `dock:${app.id}`,
        el,
        kind: 'app',
        priority: 2,
        capabilities: ['dwell', 'pinch'],
        onIntent: (intent) => {
          if ((intent.type === 'select' || intent.type === 'dwell-click') && intent.source === 'hand') {
            open(app.id);
          }
        }
      });
    });
  }

  function open(appId) {
    lastOpened = appId;
    if (onAppOpen) onAppOpen(appId);
  }

  function openLast() {
    if (lastOpened) open(lastOpened);
  }

  return { init, open, openLast };
})();
