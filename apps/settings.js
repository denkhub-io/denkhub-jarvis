/*
 * Settings. Manages the OpenAI key, gesture tuning, and the Clapper feature
 * (clap twice to open a chosen set of apps). One window at a time.
 */
Jarvis.registerApp({
  id: 'settings',
  name: 'Impostazioni',
  allowMultiple: false,
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  defaultSize: { width: 380, height: 460 },

  mount(body, api) {
    body.classList.add('settings-body');

    function section(title) {
      const h = document.createElement('div');
      h.className = 'settings-section';
      h.textContent = title;
      body.appendChild(h);
    }

    function row(labelText) {
      const r = document.createElement('div');
      r.className = 'settings-row';
      const l = document.createElement('label');
      l.textContent = labelText;
      r.appendChild(l);
      body.appendChild(r);
      return r;
    }

    function render() {
      body.innerHTML = '';

      section('Assistente AI');
      const keyRow = row('Chiave OpenAI');
      const keyInput = document.createElement('input');
      keyInput.type = 'password';
      keyInput.placeholder = 'sk-...';
      keyInput.value = localStorage.getItem('openai_api_key') || '';
      keyRow.appendChild(keyInput);

      const modelRow = row('Modello');
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.value = api.settings.get('model', 'gpt-5.4-mini');
      modelRow.appendChild(modelInput);

      const saveRow = row('');
      const saveBtn = document.createElement('button');
      saveBtn.className = 'app-btn';
      saveBtn.textContent = 'Salva chiave';
      saveBtn.addEventListener('click', () => {
        const v = keyInput.value.trim();
        if (v) localStorage.setItem('openai_api_key', v);
        else localStorage.removeItem('openai_api_key');
        api.settings.set('model', modelInput.value.trim() || 'gpt-5.4-mini');
        api.notify('Impostazioni AI salvate');
      });
      saveRow.appendChild(saveBtn);

      section('Gesti');
      toggleRow('Dwell click (punta e attendi)', GestureConfig.get('dwellEnabled'),
        (v) => GestureConfig.set('dwellEnabled', v));
      sliderRow('Tempo dwell', GestureConfig.get('dwellMs'), 400, 1200, 50, 'ms',
        (v) => GestureConfig.set('dwellMs', v));
      toggleRow('Snap magnetico', GestureConfig.get('snapEnabled'),
        (v) => GestureConfig.set('snapEnabled', v));
      sliderRow('Sensibilita pinch', GestureConfig.get('pinchEnter'), 0.03, 0.08, 0.005, '',
        (v) => GestureConfig.set('pinchEnter', v));

      const resetRow = row('');
      const resetBtn = document.createElement('button');
      resetBtn.className = 'app-btn ghost';
      resetBtn.textContent = 'Ripristina gesti';
      resetBtn.addEventListener('click', () => {
        GestureConfig.reset();
        api.notify('Gesti ripristinati');
        render();
      });
      resetRow.appendChild(resetBtn);

      section('Clapper');
      const clapHelp = document.createElement('div');
      clapHelp.className = 'settings-help';
      clapHelp.textContent = 'Batti le mani due volte e le app scelte si aprono in griglia.';
      body.appendChild(clapHelp);

      const cfg = Clapper.getConfig();
      toggleRow('Attiva Clapper (microfono)', cfg.enabled, (v) => {
        Clapper.setConfig({ enabled: v });
        if (v && !Clapper.isActive()) Clapper.start();
        api.notify(v ? 'Clapper attivo' : 'Clapper spento');
      });

      const appsRow = document.createElement('div');
      appsRow.className = 'settings-apps';
      Jarvis.dockApps().forEach((app) => {
        if (app.id === 'settings') return;
        const item = document.createElement('label');
        item.className = 'settings-app';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = cfg.apps.includes(app.id);
        cb.addEventListener('change', () => {
          const current = new Set(Clapper.getConfig().apps);
          if (cb.checked) current.add(app.id);
          else current.delete(app.id);
          Clapper.setConfig({ apps: Array.from(current) });
        });
        item.appendChild(cb);
        item.appendChild(document.createTextNode(app.name));
        appsRow.appendChild(item);
      });
      body.appendChild(appsRow);

      sliderRow('Sensibilita clap', cfg.threshold, 0.04, 0.30, 0.01, '',
        (v) => Clapper.setConfig({ threshold: v }));

      const testRow = row('');
      const testBtn = document.createElement('button');
      testBtn.className = 'app-btn';
      testBtn.textContent = 'Prova (apri le app)';
      testBtn.addEventListener('click', () => Clapper.trigger());
      testRow.appendChild(testBtn);
    }

    function toggleRow(labelText, value, onChange) {
      const r = row(labelText);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'settings-toggle';
      cb.checked = !!value;
      cb.addEventListener('change', () => onChange(cb.checked));
      r.appendChild(cb);
    }

    function sliderRow(labelText, value, min, max, step, unit, onChange) {
      const r = row(labelText);
      const wrap = document.createElement('div');
      wrap.className = 'settings-slider';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = min;
      range.max = max;
      range.step = step;
      range.value = value;
      const out = document.createElement('span');
      out.className = 'settings-value';
      out.textContent = value + (unit ? ' ' + unit : '');
      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        out.textContent = v + (unit ? ' ' + unit : '');
        onChange(v);
      });
      wrap.appendChild(range);
      wrap.appendChild(out);
      r.appendChild(wrap);
    }

    render();
  }
});
