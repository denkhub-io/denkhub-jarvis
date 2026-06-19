/*
 * Virtual cursor. Shows a crosshair that reflects the current gesture and a
 * radial ring that fills while dwelling on a target. The ring gives the user
 * continuous feedback that a dwell-click is about to fire.
 */
const CursorModule = (() => {
  let cursorEl = null;
  let ringFill = null;
  let circumference = 0;
  let x = 0;
  let y = 0;

  function init() {
    cursorEl = document.getElementById('hand-cursor');

    const r = 18;
    circumference = 2 * Math.PI * r;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'cursor-dwell');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.innerHTML =
      `<circle class="cursor-dwell-track" cx="24" cy="24" r="${r}"></circle>` +
      `<circle class="cursor-dwell-fill" cx="24" cy="24" r="${r}" ` +
      `stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" ` +
      `transform="rotate(-90 24 24)"></circle>`;
    cursorEl.appendChild(svg);
    ringFill = svg.querySelector('.cursor-dwell-fill');
  }

  function update(newX, newY) {
    x = newX;
    y = newY;
    cursorEl.style.left = `${x}px`;
    cursorEl.style.top = `${y}px`;
  }

  function setState(state) {
    cursorEl.classList.remove('pinching', 'grabbing', 'fist', 'visible');
    if (state === 'none') return;
    cursorEl.classList.add('visible');
    if (state === 'pinch') cursorEl.classList.add('pinching');
    else if (state === 'grab') cursorEl.classList.add('grabbing');
    else if (state === 'fist') cursorEl.classList.add('fist');
  }

  function setDwellProgress(p) {
    if (!ringFill) return;
    p = Math.max(0, Math.min(1, p));
    ringFill.style.strokeDashoffset = `${circumference * (1 - p)}`;
    cursorEl.classList.toggle('dwelling', p > 0);
  }

  function flashFire() {
    if (!cursorEl) return;
    cursorEl.classList.add('fire');
    setTimeout(() => cursorEl.classList.remove('fire'), 300);
  }

  function flashDoublePinch() {
    if (!cursorEl) return;
    cursorEl.classList.add('double-pinch');
    setTimeout(() => cursorEl.classList.remove('double-pinch'), 400);
  }

  function getPosition() {
    return { x, y };
  }

  return { init, update, setState, setDwellProgress, flashFire, flashDoublePinch, getPosition };
})();
