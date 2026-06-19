/*
 * Window manager. Knows nothing about specific apps. It builds the window
 * chrome (titlebar, body, resize handle), mounts an app from the registry
 * into the body, and registers the chrome plus the app's interactive content
 * with the InteractiveRegistry so everything is reachable by gesture. Mouse
 * handlers stay as a fallback. It also tiles windows into a grid, which the
 * Clapper feature uses to lay out apps on a double clap.
 */
const WindowManager = (() => {
  let container = null;
  let taskbarItems = null;
  let windows = [];
  let nextId = 1;
  let topZ = 100;
  let activeWindow = null;
  let targetSeq = 0;

  let interactionState = null;

  function init() {
    container = document.getElementById('windows-container');
    taskbarItems = document.getElementById('taskbar-items');

    const addBtn = document.getElementById('btn-add-window');
    if (addBtn) {
      addBtn.addEventListener('click', () => createWindow({ appId: 'notes' }));
      _registerDomButton(addBtn, 'taskbar-add');
    }
  }

  function _esc(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function _isTextInput(el) {
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const t = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'url', 'email', 'password', 'number', 'tel'].includes(t);
    }
    return false;
  }

  function _registerWindowTarget(spec) {
    const id = spec.id;
    InteractiveRegistry.register({
      id,
      el: spec.el,
      kind: spec.kind,
      priority: spec.priority,
      windowId: spec.windowId,
      capabilities: spec.capabilities,
      onIntent: spec.onIntent
    });
    return id;
  }

  function _registerDomButton(el, id) {
    InteractiveRegistry.register({
      id,
      el,
      kind: 'button',
      priority: 2,
      capabilities: ['dwell', 'pinch'],
      onIntent: (intent) => {
        if ((intent.type === 'select' || intent.type === 'dwell-click') && intent.source === 'hand') {
          el.click();
        }
      }
    });
  }

  function _registerAppContent(windowEl, windowId) {
    const els = windowEl.querySelectorAll(
      'button, input, textarea, select, [contenteditable="true"], a[href]'
    );
    els.forEach((el) => {
      if (el.closest('.vwindow-controls')) return;
      const focusable = _isTextInput(el);
      const id = `win:${windowId}:el:${targetSeq++}`;
      el.dataset.targetId = id;
      _registerWindowTarget({
        id,
        el,
        windowId,
        kind: focusable ? 'focus' : 'button',
        priority: 2,
        capabilities: ['dwell', 'pinch'],
        onIntent: (intent) => {
          if (intent.type !== 'select' && intent.type !== 'dwell-click') return;
          if (focusable) {
            el.focus();
            if (intent.source === 'hand' && _isTextInput(el) && typeof Keyboard !== 'undefined') {
              Keyboard.open(el);
            }
          } else if (intent.source === 'hand') {
            el.click();
          }
        }
      });
    });
  }

  function createWindow(opts = {}) {
    const app = Jarvis.getApp(opts.appId);
    if (!app) {
      console.warn('[wm] unknown app', opts.appId);
      return;
    }

    if (app.allowMultiple === false) {
      const existing = windows.find(w => w.appId === app.id);
      if (existing) { focusWindow(existing.id); return existing.id; }
    }

    const id = nextId++;
    const size = app.defaultSize;
    const w = opts.width || size.width;
    const h = opts.height || size.height;
    const win = {
      id,
      appId: app.id,
      title: opts.title || app.name,
      x: opts.x != null ? opts.x : (window.innerWidth - w) / 2 + (Math.random() - 0.5) * 80,
      y: opts.y != null ? opts.y : (window.innerHeight - h) / 2 + (Math.random() - 0.5) * 50,
      width: w,
      height: h,
      minimized: false,
      maximized: false,
      restore: null,
      instance: null
    };
    windows.push(win);

    const el = document.createElement('div');
    el.className = 'vwindow';
    el.dataset.windowId = id;
    el.dataset.appId = app.id;
    el.style.left = `${win.x}px`;
    el.style.top = `${win.y}px`;
    el.style.width = `${win.width}px`;
    el.style.height = `${win.height}px`;
    el.style.zIndex = ++topZ;
    el.innerHTML =
      `<div class="vwindow-titlebar" data-role="titlebar">` +
      `<span class="vwindow-title">${_esc(win.title)}</span>` +
      `<div class="vwindow-controls">` +
      `<button class="vwindow-btn minimize" data-action="minimize" title="Minimizza"></button>` +
      `<button class="vwindow-btn maximize" data-action="maximize" title="Ingrandisci"></button>` +
      `<button class="vwindow-btn close" data-action="close" title="Chiudi"></button>` +
      `</div></div>` +
      `<div class="vwindow-body" data-role="body"></div>` +
      `<div class="vwindow-resize" data-role="resize"></div>`;

    el.addEventListener('mousedown', () => focusWindow(id));

    el.querySelectorAll('.vwindow-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'close') closeWindow(id);
        else if (action === 'minimize') minimizeWindow(id);
        else if (action === 'maximize') maximizeWindow(id);
      });
    });

    _attachMouseDrag(el, id);

    container.appendChild(el);

    const titlebar = el.querySelector('[data-role="titlebar"]');
    const body = el.querySelector('[data-role="body"]');
    const resize = el.querySelector('[data-role="resize"]');

    _registerWindowTarget({
      id: `win:${id}:titlebar`, el: titlebar, windowId: id, kind: 'drag', priority: 0,
      capabilities: [], onIntent: (i) => _onDragIntent(i, id, 'drag')
    });
    _registerWindowTarget({
      id: `win:${id}:body`, el: body, windowId: id, kind: 'scroll', priority: 0,
      capabilities: [], onIntent: (i) => _onDragIntent(i, id, 'scroll')
    });
    _registerWindowTarget({
      id: `win:${id}:resize`, el: resize, windowId: id, kind: 'resize', priority: 1,
      capabilities: [], onIntent: (i) => _onDragIntent(i, id, 'resize')
    });

    el.querySelectorAll('.vwindow-btn').forEach((btn) => {
      const action = btn.dataset.action;
      _registerWindowTarget({
        id: `win:${id}:ctl:${action}`, el: btn, windowId: id, kind: 'button', priority: 3,
        capabilities: ['dwell', 'pinch'],
        onIntent: (intent) => {
          if (intent.type !== 'select' && intent.type !== 'dwell-click') return;
          if (action === 'close') closeWindow(id);
          else if (action === 'minimize') minimizeWindow(id);
          else if (action === 'maximize') maximizeWindow(id);
        }
      });
    });

    _updateTaskbar();
    focusWindow(id);

    const api = Jarvis.createHostApi({ appId: app.id, windowId: id, windowEl: el, bodyEl: body });
    win.instance = { unmount: app.unmount, onMessage: app.onMessage, api, appRef: app };
    try {
      const cleanup = app.mount(body, api);
      if (typeof cleanup === 'function') win.instance.unmount = cleanup;
    } catch (e) {
      console.error('[wm] mount failed for', app.id, e);
      body.textContent = 'Errore app.';
    }
    _registerAppContent(el, id);

    return id;
  }

  function _onDragIntent(intent, id, type) {
    if (intent.type === 'drag-start') {
      _startInteraction(type, id, intent.x, intent.y);
    } else if (intent.type === 'drag-move') {
      _updateInteraction(intent.x, intent.y);
    } else if (intent.type === 'drag-end') {
      _endInteraction();
    }
  }

  function _startInteraction(type, windowId, x, y) {
    const el = container.querySelector(`[data-window-id="${windowId}"]`);
    if (!el) return;
    focusWindow(windowId);
    const rect = el.getBoundingClientRect();
    if (type === 'drag') {
      interactionState = { type: 'drag', windowId, offsetX: x - rect.left, offsetY: y - rect.top };
      el.classList.add('dragging');
    } else if (type === 'resize') {
      interactionState = { type: 'resize', windowId, startX: x, startY: y, startW: rect.width, startH: rect.height };
      el.classList.add('resizing');
    } else if (type === 'scroll') {
      const body = el.querySelector('[data-role="body"]');
      interactionState = { type: 'scroll', windowId, startY: y, startScroll: body ? body.scrollTop : 0, bodyEl: body };
    }
  }

  function _updateInteraction(x, y) {
    if (!interactionState) return;
    const el = container.querySelector(`[data-window-id="${interactionState.windowId}"]`);
    if (!el) return;
    if (interactionState.type === 'drag') {
      const nx = x - interactionState.offsetX;
      const ny = y - interactionState.offsetY;
      el.style.left = `${Math.max(0, Math.min(window.innerWidth - 60, nx))}px`;
      el.style.top = `${Math.max(32, Math.min(window.innerHeight - 60, ny))}px`;
    } else if (interactionState.type === 'resize') {
      const nw = Math.max(240, interactionState.startW + (x - interactionState.startX));
      const nh = Math.max(160, interactionState.startH + (y - interactionState.startY));
      el.style.width = `${nw}px`;
      el.style.height = `${nh}px`;
    } else if (interactionState.type === 'scroll' && interactionState.bodyEl) {
      const dy = interactionState.startY - y;
      interactionState.bodyEl.scrollTop = interactionState.startScroll + dy * 1.6;
    }
  }

  function _endInteraction() {
    if (!interactionState) return;
    const el = container.querySelector(`[data-window-id="${interactionState.windowId}"]`);
    if (el) el.classList.remove('dragging', 'resizing');
    interactionState = null;
  }

  function _attachMouseDrag(el, id) {
    const titlebar = el.querySelector('[data-role="titlebar"]');
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.vwindow-controls')) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      focusWindow(id);
      const move = (ev) => {
        el.classList.add('dragging');
        el.style.left = `${ev.clientX - offX}px`;
        el.style.top = `${ev.clientY - offY}px`;
      };
      const up = () => {
        el.classList.remove('dragging');
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });

    const resize = el.querySelector('[data-role="resize"]');
    resize.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = rect.width;
      const startH = rect.height;
      const move = (ev) => {
        el.classList.add('resizing');
        el.style.width = `${Math.max(240, startW + ev.clientX - startX)}px`;
        el.style.height = `${Math.max(160, startH + ev.clientY - startY)}px`;
      };
      const up = () => {
        el.classList.remove('resizing');
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  function focusWindow(id) {
    const el = container.querySelector(`[data-window-id="${id}"]`);
    if (!el) return;
    container.querySelectorAll('.vwindow').forEach(w => w.classList.remove('focused'));
    el.style.zIndex = ++topZ;
    el.classList.add('focused');
    activeWindow = id;
    _updateTaskbar();
  }

  function _teardown(win) {
    if (win.instance && typeof win.instance.unmount === 'function') {
      try { win.instance.unmount.call(win.instance.appRef, win.instance.api); }
      catch (e) { console.error('[wm] unmount error', e); }
    }
    InteractiveRegistry.clearForWindow(win.id);
  }

  function closeWindow(id) {
    const win = windows.find(w => w.id === id);
    if (!win) return;
    _teardown(win);
    const el = container.querySelector(`[data-window-id="${id}"]`);
    if (el) {
      el.style.transition = 'opacity 0.2s, transform 0.2s';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.96)';
      setTimeout(() => el.remove(), 200);
    }
    windows = windows.filter(w => w.id !== id);
    if (activeWindow === id) activeWindow = null;
    if (interactionState && interactionState.windowId === id) interactionState = null;
    _updateTaskbar();
  }

  function minimizeWindow(id) {
    const win = windows.find(w => w.id === id);
    const el = container.querySelector(`[data-window-id="${id}"]`);
    if (!win || !el) return;
    win.minimized = !win.minimized;
    el.style.display = win.minimized ? 'none' : 'flex';
    _updateTaskbar();
  }

  function maximizeWindow(id) {
    const win = windows.find(w => w.id === id);
    const el = container.querySelector(`[data-window-id="${id}"]`);
    if (!win || !el) return;
    const margin = 16;
    const top = 120;
    const bottom = 60;
    if (!win.maximized) {
      win.restore = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      el.style.left = `${margin}px`;
      el.style.top = `${top}px`;
      el.style.width = `${window.innerWidth - margin * 2}px`;
      el.style.height = `${window.innerHeight - top - bottom}px`;
      win.maximized = true;
    } else if (win.restore) {
      el.style.left = win.restore.left;
      el.style.top = win.restore.top;
      el.style.width = win.restore.width;
      el.style.height = win.restore.height;
      win.maximized = false;
    }
    focusWindow(id);
  }

  function resizeWindow(id, width, height) {
    const el = container.querySelector(`[data-window-id="${id}"]`);
    if (!el) return;
    el.style.width = `${Math.max(240, Math.min(window.innerWidth, width))}px`;
    el.style.height = `${Math.max(160, Math.min(window.innerHeight, height))}px`;
  }

  function closeAllWindows() {
    for (const w of windows) {
      _teardown(w);
      const el = container.querySelector(`[data-window-id="${w.id}"]`);
      if (el) el.remove();
    }
    windows = [];
    activeWindow = null;
    interactionState = null;
    _updateTaskbar();
  }

  function _updateTaskbar() {
    if (!taskbarItems) return;
    taskbarItems.innerHTML = '';
    for (const win of windows) {
      const item = document.createElement('div');
      item.className = `taskbar-item${win.id === activeWindow ? ' active' : ''}`;
      item.textContent = win.title;
      item.addEventListener('click', () => {
        if (win.minimized) minimizeWindow(win.id);
        focusWindow(win.id);
      });
      taskbarItems.appendChild(item);
    }
  }

  function deliverMessage(targetAppId, message) {
    for (const win of windows) {
      if (win.appId === targetAppId && win.instance && typeof win.instance.onMessage === 'function') {
        try { win.instance.onMessage.call(win.instance.appRef, message, win.instance.api); }
        catch (e) { console.error('[wm] onMessage error', e); }
      }
    }
  }

  /*
   * Tile the given app ids into an even grid. Used by Clapper to lay out the
   * chosen apps on a double clap. Grid shape matches the clapper logic:
   * cols = ceil(sqrt(n)), rows = ceil(n / cols).
   */
  function tileApps(appIds) {
    const n = appIds.length;
    if (n === 0) return;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const margin = 16;
    const top = 120;
    const bottom = 64;
    const gap = 12;
    const availW = window.innerWidth - margin * 2;
    const availH = window.innerHeight - top - bottom;
    const cellW = (availW - gap * (cols - 1)) / cols;
    const cellH = (availH - gap * (rows - 1)) / rows;

    appIds.forEach((appId, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const itemsInRow = Math.min(cols, n - r * cols);
      const rowW = itemsInRow * cellW + (itemsInRow - 1) * gap;
      const rowStart = margin + (availW - rowW) / 2;
      const x = rowStart + c * (cellW + gap);
      const y = top + r * (cellH + gap);
      createWindow({ appId, x, y, width: Math.round(cellW), height: Math.round(cellH) });
    });
  }

  function getWindowCount() { return windows.filter(w => !w.minimized).length; }
  function getOpenAppIds() { return windows.map(w => w.appId); }

  return {
    init, createWindow, closeWindow, minimizeWindow, maximizeWindow, resizeWindow,
    focusWindow, closeAllWindows, deliverMessage, tileApps,
    getWindowCount, getOpenAppIds
  };
})();
