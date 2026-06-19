/*
 * Host API factory. The window manager calls Jarvis.createHostApi once per
 * window and passes the result to the app's mount(body, api). It gives an
 * app namespaced storage, control over its own window, notifications, the
 * shared AI service, settings, theme tokens, and the ability to spawn or
 * message other windows.
 */
(function () {
  const AI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  const DEFAULT_MODEL = 'gpt-5.4-mini';

  function makeStorage(appId) {
    const prefix = `jarvis:app:${appId}:`;
    return {
      get(key, fallback = null) {
        const raw = localStorage.getItem(prefix + key);
        if (raw === null) return fallback;
        try { return JSON.parse(raw); } catch { return fallback; }
      },
      set(key, value) {
        localStorage.setItem(prefix + key, JSON.stringify(value));
      },
      remove(key) {
        localStorage.removeItem(prefix + key);
      },
      keys() {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
        }
        return out;
      }
    };
  }

  const settings = {
    get(key, fallback = null) {
      const raw = localStorage.getItem('jarvis:settings:' + key);
      if (raw === null) return fallback;
      try { return JSON.parse(raw); } catch { return fallback; }
    },
    set(key, value) {
      localStorage.setItem('jarvis:settings:' + key, JSON.stringify(value));
    }
  };

  const ai = {
    hasKey() {
      return !!localStorage.getItem('openai_api_key');
    },
    async chat(messages, opts = {}) {
      const key = localStorage.getItem('openai_api_key');
      if (!key) throw new Error('Chiave API mancante. Aprila in Impostazioni.');
      const model = opts.model || settings.get('model', DEFAULT_MODEL);
      const body = {
        model,
        messages: opts.system
          ? [{ role: 'system', content: opts.system }, ...messages]
          : messages,
        max_tokens: opts.maxTokens || 500
      };
      const r = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      return d.choices && d.choices[0] ? d.choices[0].message.content : '';
    }
  };

  const theme = {
    accent: 'var(--accent-color)',
    bg: 'var(--bg-color)',
    text: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    radius: 'var(--radius-md)',
    token(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
  };

  function notify(message, opts) {
    if (typeof Notifications !== 'undefined') {
      Notifications.show(message, opts);
    } else {
      console.log('[notify]', message);
    }
  }

  Jarvis.createHostApi = function (ctx) {
    return {
      appId: ctx.appId,
      windowId: ctx.windowId,

      storage: makeStorage(ctx.appId),

      window: {
        setTitle(text) {
          const t = ctx.windowEl.querySelector('.vwindow-title');
          if (t) t.textContent = text;
        },
        close() { WindowManager.closeWindow(ctx.windowId); },
        minimize() { WindowManager.minimizeWindow(ctx.windowId); },
        focus() { WindowManager.focusWindow(ctx.windowId); },
        resize(width, height) { WindowManager.resizeWindow(ctx.windowId, width, height); },
        getEl() { return ctx.windowEl; }
      },

      notify,
      ai,
      settings,
      theme,

      createWindow(appId, opts = {}) {
        return WindowManager.createWindow({ appId, ...opts });
      },

      postMessage(targetAppId, topic, payload) {
        WindowManager.deliverMessage(targetAppId, {
          topic, payload, fromAppId: ctx.appId
        });
      }
    };
  };
})();
