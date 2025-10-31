// MediaPipe Hands integration (Phase 2)
// Provides: start(), stop(); renders a small preview with landmarks; emits results via onResults
import { Logger } from '../utils/logger.js';

export class GestureDetector {
  constructor({ onResults, confidenceThreshold = 0.7, previewPosition = 'bottom-right' } = {}) {
    this.onResults = onResults;
    this.confidenceThreshold = confidenceThreshold;
    this.previewPosition = previewPosition;
    this.running = false;
    this._camera = null;
    this._hands = null;
    this._video = null;
    this._canvas = null;
    this._ctx = null;
    this._lastHandsCount = -1;
    this._lastFrameTime = performance.now();
    this._fps = 0;
    this._failCount = 0;
    this._maxFailsBeforeRestart = 3;
    this._importFailed = false; // guard to prevent restart loop on import issues
    Logger.build('GestureDetector initialized');
  }

  _ensureUI() {
    if (this._video) return;
    const container = document.createElement('div');
    container.id = 'gesture-preview';
    container.style.position = 'fixed';
    container.style.zIndex = 9998;
    container.style.width = '320px';
    container.style.height = '240px';
    container.style.background = 'rgba(0,0,0,0.2)';
    container.style.border = '1px solid #0f0';
    container.style.borderRadius = '8px';
    container.style.overflow = 'hidden';

    const pos = this.previewPosition;
    if (pos.includes('bottom')) container.style.bottom = '10px';
    if (pos.includes('top')) container.style.top = '10px';
    if (pos.includes('right')) container.style.right = '10px';
    if (pos.includes('left')) container.style.left = '10px';

    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.transform = 'scaleX(-1)'; // mirror for selfie
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';

    container.appendChild(video);
    container.appendChild(canvas);
    document.body.appendChild(container);

    this._video = video;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
  }

  async _loadScriptsFallback() {
    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
    // Known-good versions pinned
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js');
    // Globals exposed by scripts
    const Hands = window.Hands;
    const Camera = window.Camera;
    if (!Hands || !Camera) throw new Error('CDN fallback did not expose Hands/Camera globals');
    return { Hands, Camera };
  }

  async _loadHandsAndCamera() {
    try {
      // Prefer bare spec imports (works under Vite/dev or proper bundling)
      const handsMod = await import('@mediapipe/hands');
      const camMod = await import('@mediapipe/camera_utils');
      const Hands = handsMod?.Hands || handsMod?.default || handsMod;
      const Camera = camMod?.Camera || camMod?.default || camMod;
      if (!Hands || !Camera) throw new Error('Invalid module exports for Hands/Camera');
      return { Hands, Camera };
    } catch (e) {
      // Bare import failed (e.g., served without bundler) → fallback to CDN scripts
      this._importFailed = true;
      Logger.error(`Bare import failed, using CDN fallback: ${e?.message || e}`);
      return await this._loadScriptsFallback();
    }
  }

  async start() {
    try {
      this._ensureUI();
      const { Hands, Camera } = await this._loadHandsAndCamera();

      this._hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      this._hands.setOptions({
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: this.confidenceThreshold,
        minTrackingConfidence: this.confidenceThreshold
      });

      this._hands.onResults((results) => this._handleResults(results));

      this._camera = new Camera(this._video, {
        onFrame: async () => {
          try {
            await this._hands.send({ image: this._video });
          } catch (e) {
            this._onFailure(e);
          }
        },
        width: 320,
        height: 240,
      });

      await this._camera.start();
      this.running = true;
      Logger.build('GestureDetector started (MediaPipe Hands running)');
    } catch (e) {
      this.running = false;
      this._onFailure(e, true);
      throw e;
    }
  }

  _onFailure(e, critical = false) {
    const msg = e?.message || String(e);
    Logger.error(`GestureDetector pipeline error: ${msg}`);
    // If imports failed, do not attempt automatic restarts as they will loop
    const importRelated = this._importFailed || /bare specifier|Failed to fetch dynamically imported module/i.test(msg);
    if (importRelated) {
      this._failCount = 0;
      this.running = false;
      // Surface a clear UI hint once
      if (!document.getElementById('gesture-import-hint')) {
        const hint = document.createElement('div');
        hint.id = 'gesture-import-hint';
        hint.style.cssText = 'position:fixed;top:10px;left:10px;background:#300;color:#f88;padding:8px;border:1px solid #f88;z-index:9999;max-width:420px;font-family:sans-serif;font-size:12px';
        hint.textContent = 'Gesture detector failed to load modules. Please use the Vite dev server (http://localhost:5173) or stay online so CDN fallback works.';
        document.body.appendChild(hint);
      }
      return;
    }

    this._failCount += 1;
    if (this._failCount >= this._maxFailsBeforeRestart || critical) {
      this._failCount = 0;
      this.restart();
    }
  }

  async restart() {
    try {
      Logger.error('GestureDetector restarting camera due to repeated failures');
      await this.stop();
      await this.start();
    } catch (e) {
      Logger.error(`GestureDetector restart failed: ${e?.message || e}`);
    }
  }

  stop() {
    try {
      this.running = false;
      if (this._camera) {
        this._camera.stop();
        this._camera = null;
      }
      if (this._hands) {
        // mediapipe hands does not expose explicit dispose; allow GC
        this._hands = null;
      }
      Logger.build('GestureDetector stopped');
    } catch (e) {
      Logger.error(`GestureDetector.stop error: ${e?.message || e}`);
      throw e;
    }
  }

  _handleResults(results) {
    try {
      const now = performance.now();
      const dt = now - this._lastFrameTime;
      this._lastFrameTime = now;
      this._fps = dt > 0 ? Math.round(1000 / dt) : 0;

      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);

      const hands = results.multiHandLandmarks || [];
      const handedness = results.multiHandedness || [];

      const valid = [];
      for (let i = 0; i < hands.length; i++) {
        const score = handedness[i]?.score ?? 0;
        if (score >= this.confidenceThreshold) valid.push({ idx: i, score });
      }

      if (this._lastHandsCount !== valid.length) {
        this._lastHandsCount = valid.length;
        Logger.gesture(`Hands detected: ${valid.length} (threshold=${this.confidenceThreshold})`);
      }

      // draw landmarks
      valid.forEach(({ idx }) => {
        const landmarks = hands[idx];
        // draw connections (basic subset)
        this._drawHand(ctx, landmarks, w, h);
      });

      // notify
      if (typeof this.onResults === 'function') {
        this.onResults({
          hands: valid.map(v => ({ landmarks: hands[v.idx], confidence: handedness[v.idx]?.score ?? 0 })),
          fps: this._fps
        });
      }
    } catch (e) {
      this._onFailure(e);
    }
  }

  _drawHand(ctx, landmarks, w, h) {
    // landmarks in normalized coordinates [0..1]; mirror is applied on video not canvas
    ctx.save();
    ctx.strokeStyle = '#00FF88';
    ctx.fillStyle = '#00FF88';
    ctx.lineWidth = 2;

    // draw points
    for (const p of landmarks) {
      const x = p.x * w;
      const y = p.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // simple lines: wrist to each fingertip (0 to 4/8/12/16/20)
    const idxs = [4, 8, 12, 16, 20];
    for (const i of idxs) {
      ctx.beginPath();
      ctx.moveTo(landmarks[0].x * w, landmarks[0].y * h);
      ctx.lineTo(landmarks[i].x * w, landmarks[i].y * h);
      ctx.stroke();
    }

    ctx.restore();
  }
}
