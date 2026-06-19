/*
 * Browser. A sandboxed iframe with a URL bar. Note that gesture clicks cannot
 * reach inside the page itself (cross origin sandbox); the URL bar and the
 * window chrome are gesture addressable, the page content is not.
 */
Jarvis.registerApp({
  id: 'browser',
  name: 'Browser',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`,
  defaultSize: { width: 620, height: 440 },

  mount(body) {
    body.innerHTML =
      `<div class="browser-body">` +
      `<div class="browser-bar">` +
      `<input type="text" class="browser-url" value="https://www.google.com" spellcheck="false">` +
      `<button class="browser-go app-btn">Vai</button>` +
      `</div>` +
      `<iframe class="browser-frame" src="https://www.google.com" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" allow="fullscreen"></iframe>` +
      `</div>`;

    const urlInput = body.querySelector('.browser-url');
    const goBtn = body.querySelector('.browser-go');
    const frame = body.querySelector('.browser-frame');

    const navigate = () => {
      let url = urlInput.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
        urlInput.value = url;
      }
      frame.src = url;
    };

    goBtn.addEventListener('click', navigate);
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate();
    });
  }
});
