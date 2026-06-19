/*
 * Toast notifications shown over the HUD. Apps reach this through api.notify.
 */
const Notifications = (() => {
  let container = null;

  function _ensure() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  function show(message, opts) {
    _ensure();
    opts = opts || {};
    const toast = document.createElement('div');
    toast.className = `toast ${opts.type || 'info'}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    const timeout = opts.timeout || 3000;
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, timeout);
  }

  return { show };
})();
