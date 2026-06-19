/*
 * On-screen keyboard. Lets the user type into a focused field entirely by
 * hand: dwell-to-focus opens it, then each key is an interactive target that
 * a dwell or pinch can press. The hardware keyboard keeps working because the
 * field holds real DOM focus.
 */
const Keyboard = (() => {
  let panel = null;
  let target = null;
  let registered = [];

  const ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', ',']
  ];

  function init() {
    panel = document.createElement('div');
    panel.id = 'osk';
    panel.className = 'osk hidden';
    document.body.appendChild(panel);
    _build();
  }

  function _key(label, action, cls) {
    const k = document.createElement('button');
    k.className = 'osk-key' + (cls ? ' ' + cls : '');
    k.textContent = label;
    k.dataset.action = action;
    k.addEventListener('click', (e) => {
      e.preventDefault();
      _press(action);
    });
    k.addEventListener('mousedown', (e) => e.preventDefault());
    return k;
  }

  function _build() {
    panel.innerHTML = '';
    ROWS.forEach((row) => {
      const r = document.createElement('div');
      r.className = 'osk-row';
      row.forEach((ch) => r.appendChild(_key(ch, 'char:' + ch)));
      panel.appendChild(r);
    });
    const bottom = document.createElement('div');
    bottom.className = 'osk-row';
    bottom.appendChild(_key('canc', 'backspace', 'wide'));
    bottom.appendChild(_key('spazio', 'space', 'space'));
    bottom.appendChild(_key('invio', 'enter', 'wide'));
    bottom.appendChild(_key('chiudi', 'close', 'wide'));
    panel.appendChild(bottom);
  }

  function _press(action) {
    if (action === 'close') { close(); return; }
    if (!target) return;
    if (action === 'backspace') { _delete(); return; }
    if (action === 'enter') { _enter(); return; }
    if (action === 'space') { _insert(' '); return; }
    if (action.startsWith('char:')) _insert(action.slice(5));
  }

  function _insert(ch) {
    target.focus();
    if (target.isContentEditable) {
      document.execCommand('insertText', false, ch);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const s = target.selectionStart != null ? target.selectionStart : target.value.length;
    const e = target.selectionEnd != null ? target.selectionEnd : target.value.length;
    target.value = target.value.slice(0, s) + ch + target.value.slice(e);
    const pos = s + ch.length;
    target.setSelectionRange(pos, pos);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function _delete() {
    target.focus();
    if (target.isContentEditable) {
      document.execCommand('delete');
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const s = target.selectionStart;
    const e = target.selectionEnd;
    if (s === e && s > 0) {
      target.value = target.value.slice(0, s - 1) + target.value.slice(e);
      target.setSelectionRange(s - 1, s - 1);
    } else if (s !== e) {
      target.value = target.value.slice(0, s) + target.value.slice(e);
      target.setSelectionRange(s, s);
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function _enter() {
    const down = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
    target.dispatchEvent(down);
    const up = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true });
    target.dispatchEvent(up);
  }

  function _registerKeys() {
    _unregisterKeys();
    panel.querySelectorAll('.osk-key').forEach((key, i) => {
      const id = `osk:key:${i}`;
      registered.push(id);
      InteractiveRegistry.register({
        id,
        el: key,
        kind: 'button',
        priority: 5,
        capabilities: ['dwell', 'pinch'],
        onIntent: (intent) => {
          if ((intent.type === 'select' || intent.type === 'dwell-click') && intent.source === 'hand') {
            _press(key.dataset.action);
          }
        }
      });
    });
  }

  function _unregisterKeys() {
    registered.forEach((id) => InteractiveRegistry.unregister(id));
    registered = [];
  }

  function open(el) {
    if (!panel) return;
    target = el;
    panel.classList.remove('hidden');
    _registerKeys();
  }

  function close() {
    if (!panel) return;
    panel.classList.add('hidden');
    _unregisterKeys();
    target = null;
  }

  function isOpen() {
    return panel && !panel.classList.contains('hidden');
  }

  return { init, open, close, isOpen };
})();
