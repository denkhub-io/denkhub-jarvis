/*
 * Hands: perception only. Reads MediaPipe landmarks each frame, tracks the
 * thumb tip as the cursor, smooths it with a One Euro filter, and classifies
 * the gesture (open, pinch, grab, fist). It then hands state plus cursor to
 * the InputRouter, which owns all interaction logic. When a pinch starts the
 * router briefly freezes the cursor, so the click lands where you were aiming
 * even though the thumb moves in to pinch.
 *
 * Gestures:
 *   open       point and move the cursor
 *   pinch      thumb and index touch, a momentary select
 *   grab       pinch held past grabHoldMs, a drag
 *   fist       all fingers curled
 *   double fist (two hands) go home
 *   double pinch (one hand, two quick taps) reopen the last app
 */
const HandsModule = (() => {
  const STATE = {
    NONE: 'none',
    OPEN: 'open',
    PINCH: 'pinch',
    GRAB: 'grab',
    FIST: 'fist'
  };

  let currentState = STATE.NONE;

  let filterX = null;
  let filterY = null;
  let fParams = { mc: null, b: null, dc: null };

  let pinching = false;
  let pinchCandidate = false;
  let candidateStart = 0;
  let pinchStart = 0;

  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;

  let handCount = 0;
  let rawLandmarks = null;

  let onDoubleFist = null;
  let onDoublePinch = null;

  let doubleFistCooldown = false;

  let lastPinchEndTime = 0;
  let lastPinchWasShort = false;
  let doublePinchCooldown = false;
  const DOUBLE_PINCH_WINDOW = 900;
  const MAX_SINGLE_PINCH_MS = 600;

  function init(callbacks) {
    callbacks = callbacks || {};
    onDoubleFist = callbacks.onDoubleFist || null;
    onDoublePinch = callbacks.onDoublePinch || null;
  }

  function _ensureFilters() {
    const mc = GestureConfig.get('oneEuroMinCutoff');
    const b = GestureConfig.get('oneEuroBeta');
    const dc = GestureConfig.get('oneEuroDCutoff');
    if (!filterX || mc !== fParams.mc || b !== fParams.b || dc !== fParams.dc) {
      filterX = Filters.OneEuro(mc, b, dc);
      filterY = Filters.OneEuro(mc, b, dc);
      fParams = { mc, b, dc };
    }
  }

  function _dist2D(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function _isFist(landmarks) {
    const tips = [8, 12, 16, 20];
    const mcps = [5, 9, 13, 17];
    let curled = 0;
    for (let i = 0; i < tips.length; i++) {
      if (landmarks[tips[i]].y > landmarks[mcps[i]].y) curled++;
    }
    return curled >= 4;
  }

  function process(results, canvasW, canvasH) {
    const hands = results.multiHandLandmarks;
    handCount = hands ? hands.length : 0;
    rawLandmarks = hands;
    const ts = performance.now();

    if (!hands || hands.length === 0) {
      currentState = STATE.NONE;
      InputRouter.onHand(STATE.NONE, cursorX, cursorY, ts);
      return;
    }

    if (hands.length >= 2) {
      if (_isFist(hands[0]) && _isFist(hands[1]) && !doubleFistCooldown) {
        doubleFistCooldown = true;
        setTimeout(() => { doubleFistCooldown = false; }, 1000);
        if (onDoubleFist) onDoubleFist();
      }
    }

    const lm = hands[0];

    const thumbTip = lm[4];
    const px = thumbTip.x;
    const py = thumbTip.y;

    const cover = (typeof CameraModule !== 'undefined') ? CameraModule.getCoverTransform() : null;
    let screenX;
    let screenY;
    if (cover && cover.drawW > 0) {
      screenX = canvasW - (cover.offsetX + px * cover.drawW);
      screenY = cover.offsetY + py * cover.drawH;
    } else {
      screenX = (1 - px) * canvasW;
      screenY = py * canvasH;
    }

    _ensureFilters();
    cursorX = filterX(screenX, ts);
    cursorY = filterY(screenY, ts);

    const handSize = Math.max(1e-4, _dist2D(lm[0], lm[9]));
    const pinchRatio = _dist2D(lm[4], lm[8]) / handSize;

    const enter = GestureConfig.get('pinchEnter');
    const exit = GestureConfig.get('pinchExit');
    const debounce = GestureConfig.get('pinchDebounceMs');
    const grabHold = GestureConfig.get('grabHoldMs');

    if (!pinching) {
      if (pinchRatio < enter) {
        if (!pinchCandidate) {
          pinchCandidate = true;
          candidateStart = ts;
        }
        if (ts - candidateStart >= debounce) {
          pinching = true;
          pinchStart = candidateStart;
          pinchCandidate = false;
          if (lastPinchWasShort && (ts - lastPinchEndTime) < DOUBLE_PINCH_WINDOW && !doublePinchCooldown) {
            doublePinchCooldown = true;
            lastPinchWasShort = false;
            setTimeout(() => { doublePinchCooldown = false; }, 500);
            if (onDoublePinch) onDoublePinch();
          }
        }
      } else {
        pinchCandidate = false;
      }
    } else if (pinchRatio > exit) {
      const duration = ts - pinchStart;
      if (duration < MAX_SINGLE_PINCH_MS) {
        lastPinchWasShort = true;
        lastPinchEndTime = ts;
      } else {
        lastPinchWasShort = false;
      }
      pinching = false;
    }

    const isFist = !pinching && _isFist(lm);
    let state;
    if (pinching) {
      state = (ts - pinchStart) > grabHold ? STATE.GRAB : STATE.PINCH;
    } else if (isFist) {
      state = STATE.FIST;
    } else {
      state = STATE.OPEN;
    }
    currentState = state;

    InputRouter.onHand(state, cursorX, cursorY, ts);
  }

  function getState() { return currentState; }
  function getHandCount() { return handCount; }
  function getCursorPos() { return { x: cursorX, y: cursorY }; }
  function getRawLandmarks() { return rawLandmarks; }

  return { init, process, getState, getHandCount, getCursorPos, getRawLandmarks, STATE };
})();
