/*
 * Clock. Shows the current time and date, updated every second.
 */
Jarvis.registerApp({
  id: 'clock',
  name: 'Orologio',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`,
  defaultSize: { width: 260, height: 180 },

  mount(body) {
    body.innerHTML =
      `<div style="text-align:center;padding-top:20px;">` +
      `<div class="clock-time" style="font-size:48px;font-weight:200;font-variant-numeric:tabular-nums;">--:--:--</div>` +
      `<div class="clock-date" style="color:var(--text-secondary);font-size:13px;margin-top:8px;">--</div>` +
      `</div>`;

    const timeEl = body.querySelector('.clock-time');
    const dateEl = body.querySelector('.clock-date');

    const tick = () => {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('it-IT');
      dateEl.textContent = now.toLocaleDateString('it-IT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    };
    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }
});
