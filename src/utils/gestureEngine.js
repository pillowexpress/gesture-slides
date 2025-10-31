// GestureEngine v3.1: palm-based swipes, no thumbs up, swipe gating while pointer active
// Gestures implemented:
// - swipe_right/left: palm center moves horizontally > swPx in < swMs with low vertical change
//   - requires open palm (allExtended) and pointer must be OFF
// - open_palm: all 5 fingers extended, low motion, hold >= palmHoldMs
// - pinch_toggle: thumb tip and index tip distance < pinchPx for >= pinchHoldMs → toggle pointer

import { Logger } from './logger.js';

function now() { return performance.now(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export class GestureEngine {
  constructor({
    onGesture,
    debounceMs = 500,
    palmHoldMs = 2000,
    swMs = 450,
    swPxFactor = 0.25, // fraction of width
    swMaxDyFactor = 0.2, // vertical constraint as fraction of height
    pinchPxFactor = 0.08, // fraction of width (e.g., 8% of preview width)
    pinchHoldMs = 250,
    requireOpenPalmForSwipe = true,
  } = {}) {
    this.onGesture = onGesture;
    this.debounceMs = debounceMs;
    this.palmHoldMs = palmHoldMs;
    this.swMs = swMs;
    this.swPxFactor = swPxFactor;
    this.swMaxDyFactor = swMaxDyFactor;
    this.pinchPxFactor = pinchPxFactor;
    this.pinchHoldMs = pinchHoldMs;
    this.requireOpenPalmForSwipe = requireOpenPalmForSwipe;

    this._palmHist = []; // palm center history {t,x,y}
    this._histWindowMs = 600;
    this._lastEmitAt = 0;

    this._hold = {
      palm: { activeSince: null },
      pinch: { activeSince: null },
    };

    this._pointerEnabled = false;
    this._lastFingers = null;
    this._history = [];
  }

  feed({ hands, w = 320, h = 240, pointerEnabled = false }) {
    this._pointerEnabled = !!pointerEnabled;

    const primary = hands && hands.length ? hands[0] : null;
    const t = now();

    if (!primary) {
      this._palmHist.push({ t, x: null, y: null });
      this._trimHistory();
      this._resetHold('palm');
      this._resetHold('pinch');
      this._lastFingers = null;
      return;
    }

    const lm = primary.landmarks;
    const palm = this._palmCenter(lm, w, h);
    this._palmHist.push({ t, x: palm.x, y: palm.y });
    this._trimHistory();

    const fingers = this._fingerStates(lm, w, h);
    this._lastFingers = fingers;

    // Motion magnitude (palm) to suppress holds when moving fast
    const recent = this._recentMotion(this._palmHist, 300);

    // Open palm hold (only when low motion)
    const lowMotion = recent.dist < 0.15 * w;
    this._processHold('palm', fingers.allExtended && lowMotion, this.palmHoldMs, 'open_palm', 0.95);

    // Pinch toggle (thumb+index)
    const pinchPx = this.pinchPxFactor * w;
    const pinchDist = this._distPx(lm[4], lm[8], w, h);
    this._processHold('pinch', pinchDist < pinchPx, this.pinchHoldMs, 'pinch_toggle', 0.95);

    // Swipes using palm center trajectory (only if pointer is OFF, and optionally only with open palm)
    this._detectSwipe(w, h);
  }

  _palmCenter(lm, w, h) {
    // Use wrist and MCPs: 0, 5, 9, 13, 17
    const ids = [0, 5, 9, 13, 17];
    let sx = 0, sy = 0;
    for (const i of ids) { sx += lm[i].x * w; sy += lm[i].y * h; }
    const n = ids.length;
    return { x: sx / n, y: sy / n };
  }

  _recentMotion(hist, windowMs) {
    const tNow = now();
    const pts = hist.filter(p => p.x != null && tNow - p.t <= windowMs);
    if (pts.length < 2) return { dist: 0, dx: 0, dy: 0, dt: 0 };
    const a = pts[0], b = pts[pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, dt = b.t - a.t;
    return { dist: Math.hypot(dx, dy), dx, dy, dt };
  }

  _trimHistory() {
    const cutoff = now() - this._histWindowMs;
    while (this._palmHist.length && this._palmHist[0].t < cutoff) this._palmHist.shift();
  }

  _processHold(key, condition, durationMs, gesture, confidence) {
    const st = this._hold[key];
    const t = now();
    if (condition) {
      if (!st.activeSince) st.activeSince = t;
      if (t - st.activeSince >= durationMs) {
        this._emit(gesture, confidence);
        st.activeSince = t + 1e9; // block until reset
      }
    } else {
      this._resetHold(key);
    }
  }

  _resetHold(key) { if (this._hold[key]) this._hold[key].activeSince = null; }

  _detectSwipe(w, h) {
    // Gate swipes: do not detect while pointer is active
    if (this._pointerEnabled) return;
    // Optionally require open palm to initiate swipe
    if (this.requireOpenPalmForSwipe && !(this._lastFingers && this._lastFingers.allExtended)) return;

    const pts = this._palmHist.filter(p => p.x != null);
    if (!pts.length) return;
    const end = pts[pts.length - 1];
    // find the earliest point still within swMs
    let start = null;
    for (let i = pts.length - 2; i >= 0; i--) {
      if (end.t - pts[i].t <= this.swMs) start = pts[i]; else break;
    }
    if (!start) return;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const swPx = this.swPxFactor * w;
    const maxDy = this.swMaxDyFactor * h;

    if (Math.abs(dy) <= maxDy) {
      if (dx > swPx) {
        this._emit('swipe_right', clamp(dx / (swPx * 2), 0.5, 1));
      } else if (dx < -swPx) {
        this._emit('swipe_left', clamp(Math.abs(dx) / (swPx * 2), 0.5, 1));
      }
    }
  }

  _emit(name, confidence = 1.0) {
    const t = now();
    if (t - this._lastEmitAt < this.debounceMs) return;
    this._lastEmitAt = t;
    Logger.gesture(`${name} detected (conf=${confidence.toFixed(2)})`);
    try {
      this.onGesture && this.onGesture({ name, confidence, t });
      this._history.push({ name, confidence, t: Date.now() });
      if (this._history.length > 50) this._history.shift();
    } catch (e) {}
  }

  // Debug helper to read gesture history
  getHistory() { return this._history; }

  _distPx(a, b, w, h) {
    const ax = a.x * w, ay = a.y * h;
    const bx = b.x * w, by = b.y * h;
    return Math.hypot(bx - ax, by - ay);
  }

  _fingerStates(lm, w, h) {
    const asPx = (p) => ({ x: p.x * w, y: p.y * h });
    const idx = { thumb:4, index:8, middle:12, ring:16, pinky:20 };
    const pipIdx = { index:6, middle:10, ring:14, pinky:18 };

    const tip = (i) => asPx(lm[i]);
    const joint = (i) => asPx(lm[i]);

    const tIndex = tip(idx.index), pIndex = joint(pipIdx.index);
    const tMiddle = tip(idx.middle), pMiddle = joint(pipIdx.middle);
    const tRing = tip(idx.ring), pRing = joint(pipIdx.ring);
    const tPinky = tip(idx.pinky), pPinky = joint(pipIdx.pinky);

    const upMargin = 8; // px
    const indexExt = tIndex.y < pIndex.y - upMargin;
    const middleExt = tMiddle.y < pMiddle.y - upMargin;
    const ringExt = tRing.y < pRing.y - upMargin;
    const pinkyExt = tPinky.y < pPinky.y - upMargin;

    // Thumb extension (no thumbs up gesture in this version)
    const thumbTip = tip(idx.thumb);
    const thumbMcp = asPx(lm[2]);
    const thumbIp = asPx(lm[3]);
    const thumbExt = (Math.hypot(thumbTip.x - thumbMcp.x, thumbTip.y - thumbMcp.y) > 36) && (thumbTip.y < thumbIp.y - 6);

    const allExtended = indexExt && middleExt && ringExt && pinkyExt && thumbExt;

    return { indexExt, middleExt, ringExt, pinkyExt, thumbExt, allExtended };
  }
}
