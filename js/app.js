/*
 * Boot and orchestration. Initializes every module, wires the hand pipeline
 * to the InputRouter, and subscribes to the intent bus for the few global
 * gestures (go home, reopen last app). All app behavior lives in the apps and
 * the targets they register, so this file stays small.
 */
const App = (() => {
  async function init() {
    CursorModule.init();
    HUDModule.init();
    Keyboard.init();
    WindowManager.init();
    HomeModule.init(_openApp);
    MouseInput.init();
    Clapper.init();

    InputRouter.init({ emit: _handleIntent });

    HandsModule.init({
      onDoubleFist: () => InputRouter.fireGlobal('home'),
      onDoublePinch: () => {
        CursorModule.flashDoublePinch();
        InputRouter.fireGlobal('open-last');
      }
    });

    _registerChromeButton('btn-fullscreen', 'chrome-fullscreen', _toggleFullscreen);
    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) fsBtn.addEventListener('click', _toggleFullscreen);

    const enterBtn = document.getElementById('btn-enter-fullscreen');

    try {
      await CameraModule.init(_handleFrame);
      document.getElementById('loading-status').textContent = 'Sistemi pronti.';
      enterBtn.style.display = 'inline-block';

      const enter = () => {
        _requestFullscreen();
        setTimeout(() => {
          document.getElementById('loading-screen').classList.add('hidden');
        }, 300);
        if (Clapper.getConfig().enabled) Clapper.start();
      };

      enterBtn.addEventListener('click', enter);
      document.getElementById('loading-screen').addEventListener('click', (e) => {
        if (e.target !== enterBtn) enter();
      });
    } catch (err) {
      document.getElementById('loading-status').textContent = 'Errore webcam: ' + err.message;
    }

    _updateStatusTime();
    setInterval(_updateStatusTime, 1000);
    setInterval(_updateHUDMetrics, 200);

    document.addEventListener('fullscreenchange', () => {
      document.getElementById('btn-fullscreen').classList.toggle('active', !!document.fullscreenElement);
    });
  }

  function _registerChromeButton(elId, targetId, handler) {
    const el = document.getElementById(elId);
    if (!el) return;
    InteractiveRegistry.register({
      id: targetId,
      el,
      kind: 'button',
      priority: 2,
      capabilities: ['dwell', 'pinch'],
      onIntent: (intent) => {
        if ((intent.type === 'select' || intent.type === 'dwell-click') && intent.source === 'hand') {
          handler();
        }
      }
    });
  }

  function _handleIntent(intent) {
    if (intent.type === 'home') WindowManager.closeAllWindows();
    else if (intent.type === 'open-last') HomeModule.openLast();
  }

  function _openApp(appId) {
    WindowManager.createWindow({ appId });
  }

  function _handleFrame(results, w, h) {
    HandsModule.process(results, w, h);
  }

  function _requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  function _toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      _requestFullscreen();
    }
  }

  function _updateHUDMetrics() {
    const pos = CursorModule.getPosition();
    const fps = CameraModule.getFPS();
    HUDModule.updateMetrics({
      fps,
      hands: HandsModule.getHandCount(),
      gesture: HandsModule.getState(),
      mode: WindowManager.getWindowCount() > 0 ? 'DESKTOP' : 'HOME',
      windows: WindowManager.getWindowCount(),
      x: pos.x,
      y: pos.y
    });
    const statusFps = document.getElementById('status-fps');
    if (statusFps) statusFps.textContent = fps + ' FPS';
  }

  function _updateStatusTime() {
    const el = document.getElementById('status-time');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
