/*
 * InputRouter: the single place that turns hand state plus a cursor into
 * high level intents (hover, dwell-click, select, drag, scroll). It owns the
 * dwell timer, magnetic snap, and the pinch freeze. Both the hand pipeline
 * and the mouse fallback feed it, so the rest of the UI is identical under
 * either input. Targets receive intents through their onIntent callback.
 */
const InputRouter = (() => {
  let emit = () => {};

  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  let prevState = 'none';

  let freezeUntil = 0;
  let freezePos = { x: cx, y: cy };

  let hoverTarget = null;
  let dwellTarget = null;
  let dwellStart = 0;
  let dwellAnchor = { x: 0, y: 0 };
  let cooldownUntil = 0;

  let latchedTarget = null;
  let dragTarget = null;
  let dragLast = { x: 0, y: 0 };

  function init(opts) {
    emit = opts.emit || emit;
  }

  function _snap(x, y) {
    if (!GestureConfig.get('snapEnabled')) return { x, y };
    const radius = GestureConfig.get('snapRadiusPx');
    const near = InteractiveRegistry.targetsNear(x, y, radius);
    if (near.length === 0) return { x, y };
    near.sort((a, b) => a.dist - b.dist);
    const n = near[0];
    const t = 1 - n.dist / radius;
    const pull = GestureConfig.get('snapStrength') * t;
    return {
      x: x + (n.cx - x) * pull,
      y: y + (n.cy - y) * pull
    };
  }

  function _setHover(target) {
    if (hoverTarget === target) return;
    if (hoverTarget && hoverTarget.el) {
      hoverTarget.el.classList.remove('hovered', 'dwelling');
    }
    hoverTarget = target;
    if (hoverTarget && hoverTarget.el) {
      hoverTarget.el.classList.add('hovered');
    }
  }

  function _resetDwell(target, now) {
    dwellTarget = target;
    dwellStart = now;
    dwellAnchor = { x: cx, y: cy };
    if (target && target.el) target.el.classList.remove('dwelling');
    CursorModule.setDwellProgress(0);
  }

  function _runDwell(now) {
    if (!GestureConfig.get('dwellEnabled')) {
      CursorModule.setDwellProgress(0);
      return;
    }
    const target = hoverTarget;
    if (!target || !(target.capabilities || []).includes('dwell')) {
      if (dwellTarget) _resetDwell(null, now);
      return;
    }
    if (target !== dwellTarget) {
      _resetDwell(target, now);
      return;
    }
    const moved = Math.hypot(cx - dwellAnchor.x, cy - dwellAnchor.y);
    if (moved > GestureConfig.get('dwellMoveTolerancePx')) {
      dwellAnchor = { x: cx, y: cy };
      dwellStart = now;
    }
    const progress = Math.min(1, (now - dwellStart) / GestureConfig.get('dwellMs'));
    CursorModule.setDwellProgress(progress);
    if (target.el) target.el.classList.add('dwelling');

    if (progress >= 1 && now >= cooldownUntil && target.armed) {
      target.armed = false;
      cooldownUntil = now + GestureConfig.get('dwellCooldownMs');
      CursorModule.flashFire();
      _fire(target, { type: 'dwell-click', x: cx, y: cy, target, source: 'hand' });
      _resetDwell(null, now);
    }
  }

  function _rearmCheck() {
    const rearm = GestureConfig.get('dwellRearmExitPx');
    for (const t of [hoverTarget]) {
      if (t && !t.armed) {
        const r = t.getRect ? t.getRect() : (t.el ? t.el.getBoundingClientRect() : null);
        if (!r) continue;
        const inside =
          cx >= r.left - rearm && cx <= r.right + rearm &&
          cy >= r.top - rearm && cy <= r.bottom + rearm;
        if (!inside) t.armed = true;
      }
    }
  }

  function _fire(target, intent) {
    if (target && typeof target.onIntent === 'function') target.onIntent(intent);
    emit(intent);
  }

  /*
   * Called by hands.js once per frame with the filtered palm cursor and the
   * current gesture state (none, open, pinch, grab, fist).
   */
  function onHand(state, rawX, rawY, ts) {
    const now = ts;
    const risingPinch = state === 'pinch' && prevState !== 'pinch' && prevState !== 'grab';

    if (risingPinch) {
      freezePos = { x: cx, y: cy };
      freezeUntil = now + GestureConfig.get('pinchFreezeMs');
      latchedTarget = InteractiveRegistry.hitTest(cx, cy);
      _resetDwell(null, now);
    }

    let nx = rawX;
    let ny = rawY;
    if (now < freezeUntil) {
      nx = freezePos.x;
      ny = freezePos.y;
    } else if (state === 'open') {
      const s = _snap(rawX, rawY);
      nx = s.x;
      ny = s.y;
    }
    cx = nx;
    cy = ny;

    CursorModule.update(cx, cy);
    CursorModule.setState(state);

    if (state === 'open') {
      const target = InteractiveRegistry.hitTest(cx, cy);
      _setHover(target);
      _rearmCheck();
      _runDwell(now);
      emit({ type: 'hover', x: cx, y: cy, target, source: 'hand' });
    } else {
      _setHover(null);
      if (dwellTarget) _resetDwell(null, now);
    }

    if (state === 'grab' && prevState === 'pinch') {
      dragTarget = latchedTarget;
      dragLast = { x: cx, y: cy };
      _fire(dragTarget, { type: 'drag-start', x: cx, y: cy, target: dragTarget, source: 'hand' });
    } else if (state === 'grab' && prevState === 'grab') {
      const dx = cx - dragLast.x;
      const dy = cy - dragLast.y;
      dragLast = { x: cx, y: cy };
      _fire(dragTarget, { type: 'drag-move', x: cx, y: cy, target: dragTarget, source: 'hand', data: { dx, dy } });
    }

    const releasedPinch = prevState === 'pinch' && state !== 'pinch' && state !== 'grab';
    if (releasedPinch && latchedTarget) {
      _fire(latchedTarget, { type: 'select', x: cx, y: cy, target: latchedTarget, source: 'hand' });
      latchedTarget = null;
    }

    const releasedGrab = prevState === 'grab' && state !== 'grab';
    if (releasedGrab) {
      _fire(dragTarget, { type: 'drag-end', x: cx, y: cy, target: dragTarget, source: 'hand' });
      dragTarget = null;
      latchedTarget = null;
    }

    prevState = state;
  }

  function fireGlobal(type) {
    emit({ type, x: cx, y: cy, target: null, source: 'hand' });
  }

  /* Mouse fallback. Produces the same intents from real pointer events. */
  function onMouse(type, x, y, data) {
    cx = x;
    cy = y;
    if (type === 'move') {
      CursorModule.update(x, y);
      const target = InteractiveRegistry.hitTest(x, y);
      _setHover(target);
      emit({ type: 'hover', x, y, target, source: 'mouse' });
    } else if (type === 'click') {
      const target = InteractiveRegistry.hitTest(x, y);
      if (target) _fire(target, { type: 'select', x, y, target, source: 'mouse' });
    } else if (type === 'wheel') {
      const target = InteractiveRegistry.hitTest(x, y);
      if (target && target.kind === 'scroll') {
        _fire(target, { type: 'scroll', x, y, target, source: 'mouse', data });
      }
    }
  }

  function getCursor() { return { x: cx, y: cy }; }

  return { init, onHand, onMouse, fireGlobal, getCursor };
})();
