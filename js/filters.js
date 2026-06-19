/*
 * One Euro filter for smoothing a noisy pointer signal.
 * Smooths hard when the value is nearly still (removes tremor) and
 * barely smooths when it moves fast (keeps latency low).
 * Reference: Casiez, Roussel, Vogel (2012).
 */
const Filters = (() => {
  function lowpass(alpha, value, prev) {
    return alpha * value + (1 - alpha) * prev;
  }

  function OneEuro(minCutoff, beta, dCutoff) {
    let xPrev = null;
    let dxPrev = 0;
    let tPrev = null;

    function alpha(cutoff, dt) {
      const tau = 1 / (2 * Math.PI * cutoff);
      return 1 / (1 + tau / dt);
    }

    return function filter(value, timestampMs) {
      if (xPrev === null) {
        xPrev = value;
        tPrev = timestampMs;
        return value;
      }
      const dt = Math.max(0.001, (timestampMs - tPrev) / 1000);
      tPrev = timestampMs;

      const dx = (value - xPrev) / dt;
      const edx = lowpass(alpha(dCutoff, dt), dx, dxPrev);
      dxPrev = edx;

      const cutoff = minCutoff + beta * Math.abs(edx);
      const ex = lowpass(alpha(cutoff, dt), value, xPrev);
      xPrev = ex;
      return ex;
    };
  }

  return { OneEuro };
})();
