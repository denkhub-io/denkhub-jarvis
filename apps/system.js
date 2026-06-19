/*
 * System monitor. Shows live telemetry from the camera, hand tracking, and
 * window manager.
 */
Jarvis.registerApp({
  id: 'system',
  name: 'Sistema',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="21" x2="9" y2="9"/>
  </svg>`,
  defaultSize: { width: 280, height: 220 },

  mount(body) {
    body.innerHTML =
      `<div class="system-info" style="font-size:12px;line-height:1.9;">` +
      `<div><span class="k">FPS</span><span class="v sys-fps">--</span></div>` +
      `<div><span class="k">Mani</span><span class="v sys-hands">--</span></div>` +
      `<div><span class="k">Gesto</span><span class="v sys-gesture">--</span></div>` +
      `<div><span class="k">Cursore</span><span class="v sys-cursor">--</span></div>` +
      `<div><span class="k">Finestre</span><span class="v sys-windows">--</span></div>` +
      `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-color);color:var(--text-secondary);">Engine MediaPipe Hands</div>` +
      `</div>`;

    const fpsEl = body.querySelector('.sys-fps');
    const handsEl = body.querySelector('.sys-hands');
    const gestureEl = body.querySelector('.sys-gesture');
    const cursorEl = body.querySelector('.sys-cursor');
    const windowsEl = body.querySelector('.sys-windows');

    const tick = () => {
      fpsEl.textContent = CameraModule.getFPS();
      handsEl.textContent = HandsModule.getHandCount();
      gestureEl.textContent = HandsModule.getState();
      const pos = CursorModule.getPosition();
      cursorEl.textContent = `${Math.round(pos.x)}, ${Math.round(pos.y)}`;
      windowsEl.textContent = WindowManager.getWindowCount();
    };
    tick();
    const timer = setInterval(tick, 200);

    return () => clearInterval(timer);
  }
});
