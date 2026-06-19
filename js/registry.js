/*
 * InteractiveRegistry: the set of things the cursor can target.
 * Every gesture-addressable element registers here. Hit testing uses
 * each target's rect inflated by hitInflatePx, so small controls become
 * comfortably hittable by hand. The window manager, dock, and apps only
 * implement onIntent on the targets they register; they never read raw
 * landmarks.
 */
const InteractiveRegistry = (() => {
  const targets = new Map();

  function register(target) {
    if (!target || !target.id) {
      console.warn('[registry] target missing id', target);
      return;
    }
    target.kind = target.kind || 'button';
    target.capabilities = target.capabilities || ['dwell', 'pinch'];
    target.armed = true;
    targets.set(target.id, target);
    return target.id;
  }

  function unregister(id) {
    targets.delete(id);
  }

  function get(id) { return targets.get(id) || null; }

  function _rectOf(t) {
    if (typeof t.getRect === 'function') return t.getRect();
    if (t.el) return t.el.getBoundingClientRect();
    return null;
  }

  function _zOf(t) {
    if (t.el) {
      const win = t.el.closest('.vwindow');
      if (win) return parseInt(win.style.zIndex) || 0;
      return 1;
    }
    return t.z || 0;
  }

  /*
   * Returns the topmost target whose inflated rect contains (x, y).
   * Topmost respects window z order so controls on the focused window win.
   */
  function hitTest(x, y) {
    const inflate = GestureConfig.get('hitInflatePx');
    let hit = null;
    let bestZ = -Infinity;

    for (const t of targets.values()) {
      const r = _rectOf(t);
      if (!r) continue;
      if (r.width === 0 && r.height === 0) continue;
      if (t.el && (t.el.offsetParent === null && t.el.getClientRects().length === 0)) continue;
      if (
        x >= r.left - inflate && x <= r.right + inflate &&
        y >= r.top - inflate && y <= r.bottom + inflate
      ) {
        const z = _zOf(t);
        if (z >= bestZ) {
          bestZ = z;
          hit = t;
        }
      }
    }
    return hit;
  }

  /*
   * Centers of all targets within radius of (x, y), used by magnetic snap.
   */
  function targetsNear(x, y, radius) {
    const out = [];
    for (const t of targets.values()) {
      if (t.kind === 'drag' || t.kind === 'resize' || t.kind === 'scroll') continue;
      const r = _rectOf(t);
      if (!r || (r.width === 0 && r.height === 0)) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(cx - x, cy - y);
      if (d <= radius) out.push({ target: t, cx, cy, dist: d });
    }
    return out;
  }

  function clearForWindow(windowId) {
    for (const [id, t] of targets) {
      if (t.windowId === windowId) targets.delete(id);
    }
  }

  return { register, unregister, get, hitTest, targetsNear, clearForWindow };
})();
