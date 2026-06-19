/*
 * Hello World: the template for building a Jarvis app.
 *
 * An app is a single object passed to Jarvis.registerApp. The only required
 * fields are id, name, icon, defaultSize, and mount. To build your own app,
 * copy this file, rename it, change the id/name/icon, write your UI inside
 * mount(), and add one <script> line for it in index.html.
 *
 * mount(body, api) receives the empty window body and a host api. Return a
 * function to clean up timers or listeners when the window closes.
 */
Jarvis.registerApp({
  id: 'hello',
  name: 'Hello World',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>`,
  defaultSize: { width: 300, height: 230 },

  mount(body, api) {
    let count = api.storage.get('count', 0);

    body.style.padding = '18px';
    body.style.textAlign = 'center';

    const label = document.createElement('div');
    label.style.color = 'var(--text-secondary)';
    label.style.marginBottom = '10px';
    label.textContent = 'Hai premuto';

    const value = document.createElement('div');
    value.style.fontSize = '44px';
    value.style.fontWeight = '200';
    value.style.color = api.theme.accent;
    value.textContent = String(count);

    const button = document.createElement('button');
    button.textContent = 'Aggiungi uno';
    button.className = 'app-btn';
    button.style.marginTop = '16px';

    button.addEventListener('click', () => {
      count += 1;
      value.textContent = String(count);
      api.storage.set('count', count);
      api.notify('Salvato: ' + count);
    });

    body.append(label, value, button);

    return () => {
      // Clean up here. This example has nothing to clean.
    };
  }
});
