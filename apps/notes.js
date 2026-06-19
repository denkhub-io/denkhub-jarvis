/*
 * Notes. A plain text editor whose content is saved to this app's private
 * storage, so it survives reloads.
 */
Jarvis.registerApp({
  id: 'notes',
  name: 'Note',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>`,
  defaultSize: { width: 340, height: 280 },

  mount(body, api) {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.spellcheck = false;
    editor.style.cssText = 'outline:none;min-height:100%;white-space:pre-wrap;cursor:text;padding:4px;line-height:1.5;';
    editor.textContent = api.storage.get('text', '');
    body.appendChild(editor);

    let debounce;
    const save = () => api.storage.set('text', editor.textContent);
    editor.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(save, 300);
    });

    return () => {
      clearTimeout(debounce);
      save();
    };
  }
});
