/*
 * AI Chat, the Jarvis assistant. Talks to OpenAI through the shared api.ai
 * service, which reads the user's key from the Settings app. No key, no calls.
 */
Jarvis.registerApp({
  id: 'ai',
  name: 'AI Chat',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v1H6a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-3V5a3 3 0 0 0-3-3z"/>
    <circle cx="9.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
    <circle cx="14.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
  </svg>`,
  defaultSize: { width: 380, height: 320 },

  mount(body, api) {
    body.innerHTML =
      `<div class="ai-chat-body">` +
      `<div class="ai-messages"></div>` +
      `<div class="ai-input-row">` +
      `<input type="text" class="ai-input" placeholder="Scrivi un messaggio..." autocomplete="off">` +
      `<button class="ai-send app-btn">Invia</button>` +
      `</div></div>`;

    const messagesEl = body.querySelector('.ai-messages');
    const input = body.querySelector('.ai-input');
    const sendBtn = body.querySelector('.ai-send');
    const history = [];
    const SYSTEM = 'Sei JARVIS, assistente del DenkHub Jarvis virtual desktop. Rispondi conciso, in italiano.';

    function add(role, text) {
      const d = document.createElement('div');
      d.className = `ai-msg ${role}`;
      const r = document.createElement('span');
      r.className = 'role';
      r.textContent = role === 'user' ? 'Tu' : 'JARVIS';
      d.appendChild(r);
      d.appendChild(document.createTextNode(text));
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return d;
    }

    if (!api.ai.hasKey()) {
      add('assistant', 'Ciao. Per chattare aggiungi la tua chiave OpenAI in Impostazioni.');
    } else {
      add('assistant', 'Ciao, sono JARVIS. Come posso aiutarti?');
    }

    async function send() {
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      add('user', msg);
      history.push({ role: 'user', content: msg });
      const loading = add('assistant', 'Elaborazione...');
      try {
        const reply = await api.ai.chat(history, { system: SYSTEM });
        loading.remove();
        add('assistant', reply);
        history.push({ role: 'assistant', content: reply });
      } catch (e) {
        loading.remove();
        add('assistant', 'Errore: ' + e.message);
      }
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send();
    });
  }
});
