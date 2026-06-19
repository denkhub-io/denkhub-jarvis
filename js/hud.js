/*
 * Heads-up display. Draws the animated reticle, arcs, tick marks, scan grid,
 * and edge glow on the HUD canvas, and updates the side telemetry panels.
 */
const HUDModule = (() => {
  let canvas = null;
  let ctx = null;
  let animFrame = null;
  let time = 0;

  function init() {
    canvas = document.getElementById('hud-canvas');
    ctx = canvas.getContext('2d');
    _resize();
    window.addEventListener('resize', _resize);
    _animate();
  }

  function _resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function _animate() {
    time += 0.008;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    _drawReticle(cx, cy, time);
    _drawRotatingArc(cx, 80, 50, time * 0.6, 'rgba(41, 151, 255, 0.12)');
    _drawRotatingArc(cx, 80, 40, -time * 0.4, 'rgba(41, 151, 255, 0.08)');
    _drawCornerTicks(w, h);
    _drawScanGrid(w, h, time);
    _drawEdgeGlow(w, h, time);

    animFrame = requestAnimationFrame(_animate);
  }

  function _drawReticle(cx, cy, t) {
    const size = 30;
    const alpha = 0.08 + Math.sin(t * 2) * 0.03;

    ctx.strokeStyle = `rgba(41, 151, 255, ${alpha})`;
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    const gap = 8;
    ctx.beginPath();
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + size, cy);
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + size);
    ctx.stroke();
  }

  function _drawRotatingArc(cx, cy, radius, angle, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle, angle + Math.PI * 0.8);
    ctx.stroke();
  }

  function _drawCornerTicks(w, h) {
    ctx.strokeStyle = 'rgba(41, 151, 255, 0.15)';
    ctx.lineWidth = 1;
    const len = 20;
    const offset = 40;
    const topY = 36;

    ctx.beginPath();
    ctx.moveTo(offset, topY);
    ctx.lineTo(offset + len, topY);
    ctx.moveTo(offset, topY);
    ctx.lineTo(offset, topY + len);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - offset, topY);
    ctx.lineTo(w - offset - len, topY);
    ctx.moveTo(w - offset, topY);
    ctx.lineTo(w - offset, topY + len);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, h - 60);
    ctx.lineTo(offset + len, h - 60);
    ctx.moveTo(offset, h - 60);
    ctx.lineTo(offset, h - 60 - len);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - offset, h - 60);
    ctx.lineTo(w - offset - len, h - 60);
    ctx.moveTo(w - offset, h - 60);
    ctx.lineTo(w - offset, h - 60 - len);
    ctx.stroke();
  }

  function _drawScanGrid(w, h, t) {
    ctx.strokeStyle = 'rgba(41, 151, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const spacing = 60;
    for (let y = 40; y < h - 60; y += spacing) {
      const offset = Math.sin(t + y * 0.01) * 2;
      ctx.beginPath();
      ctx.moveTo(200, y + offset);
      ctx.lineTo(w - 200, y + offset);
      ctx.stroke();
    }
  }

  function _drawEdgeGlow(w, h, t) {
    const gradient = ctx.createLinearGradient(0, 0, 6, 0);
    gradient.addColorStop(0, `rgba(41, 151, 255, ${0.06 + Math.sin(t) * 0.02})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 40, 6, h - 100);

    const gradient2 = ctx.createLinearGradient(w, 0, w - 6, 0);
    gradient2.addColorStop(0, `rgba(41, 151, 255, ${0.06 + Math.sin(t + 1) * 0.02})`);
    gradient2.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient2;
    ctx.fillRect(w - 6, 40, 6, h - 100);
  }

  function updateMetrics(data) {
    _setText('hud-fps', data.fps || '--');
    _setText('hud-hands', data.hands || '0');
    _setText('hud-gesture', (data.gesture || 'IDLE').toUpperCase());
    _setText('hud-mode', data.mode || 'CURSORE');
    _setText('hud-windows', data.windows || '0');
    _setText('hud-x', data.x != null ? Math.round(data.x) : '--');
    _setText('hud-y', data.y != null ? Math.round(data.y) : '--');

    const fpsBar = document.getElementById('hud-fps-bar');
    if (fpsBar) {
      fpsBar.style.width = Math.min(100, ((data.fps || 0) / 30) * 100) + '%';
    }

    const rows = document.querySelectorAll('.hud-gesture-row');
    rows.forEach(row => row.classList.remove('active'));
    const activeGesture = data.gesture || '';
    const row = document.querySelector(`.hud-gesture-row[data-gesture="${activeGesture}"]`);
    if (row) row.classList.add('active');
  }

  function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function destroy() {
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  return { init, updateMetrics, destroy };
})();
