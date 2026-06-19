/*
 * Mouse fallback. Real pointer events are translated into the same intents
 * the hand pipeline produces, so the desktop works with a mouse for
 * development and for anyone without a webcam. Window dragging and the native
 * button click handlers stay in the window manager; this module covers
 * cursor movement, gesture style clicks, and wheel scrolling.
 */
const MouseInput = (() => {
  let enabled = true;

  function init() {
    document.addEventListener('mousemove', (e) => {
      if (!enabled) return;
      InputRouter.onMouse('move', e.clientX, e.clientY);
    });

    document.addEventListener('click', (e) => {
      if (!enabled) return;
      if (e.target.closest('.vwindow-titlebar') || e.target.closest('.vwindow-resize')) return;
      InputRouter.onMouse('click', e.clientX, e.clientY);
    });

    document.addEventListener('wheel', (e) => {
      if (!enabled) return;
      InputRouter.onMouse('wheel', e.clientX, e.clientY, { dy: e.deltaY });
    }, { passive: true });
  }

  function setEnabled(v) { enabled = v; }

  return { init, setEnabled };
})();
