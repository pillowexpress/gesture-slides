import { GestureDetector } from './components/GestureDetector.js';
import { DebugPanel } from './components/DebugPanel.js';
import { Logger } from './utils/logger.js';
import { GestureEngine } from './utils/gestureEngine.js';
import { SlideController } from './components/SlideController.js';

console.log('[INIT] GestureSlides main.js loaded');

// Use existing DOM from index.html (do not inject duplicate UI)
const startBtn = document.getElementById('start');
const togglePointerBtn = document.getElementById('togglePointer');
const statusEl = document.getElementById('status');

const dbg = DebugPanel();
let errors = 0;
let slide = 1;

const slides = new SlideController();
let det = null;
let engine = null;
let gestureHistory = [];

function flashFeedback(text) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:10px;right:10px;background:#111;color:#0f0;padding:8px;border:1px solid #0f0;z-index:9999;font-family:sans-serif';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

if (togglePointerBtn) {
  togglePointerBtn.addEventListener('click', () => {
    const newState = !slides.pointerEnabled;
    slides.pointerMode(newState);
    flashFeedback(`pointer ${newState ? 'on' : 'off'}`);
  });
}

if (startBtn) {
  startBtn.addEventListener('click', async () => {
    try {
      await slides.init();
      det = new GestureDetector({
        confidenceThreshold: 0.7,
        onResults: ({ hands, fps }) => {
          dbg.update({ gesture: `hands=${hands.length}`, confidence: hands[0]?.confidence?.toFixed(2) ?? '-', slide, errors, fps, history: gestureHistory, pointer: slides.pointerEnabled });
          engine?.feed({ hands, w: 320, h: 240, pointerEnabled: slides.pointerEnabled });
          if (slides.pointerEnabled && hands[0]?.landmarks?.[8]) {
            const p = hands[0].landmarks[8];
            slides.movePointer(p.x * window.innerWidth, p.y * window.innerHeight);
          }
        }
      });

      engine = new GestureEngine({
        onGesture: ({ name, confidence }) => {
          Logger.gesture(`${name} conf=${confidence.toFixed(2)}`);
          flashFeedback(name);
          gestureHistory.push({ name, confidence, t: Date.now() });
          if (gestureHistory.length > 5) gestureHistory.shift();
          switch (name) {
            case 'swipe_right': slides.next(); break;
            case 'swipe_left': slides.prev(); break;
            case 'open_palm': slides.pauseNotes(); break;
            case 'pinch_toggle': slides.pointerMode(!slides.pointerEnabled); break;
          }
        }
      });

      await det.start();
      if (statusEl) statusEl.textContent = 'Camera/Hands: Running. Gestures active.';
    } catch (e) {
      errors += 1;
      dbg.update({ errors });
      Logger.error(`Start failed: ${e?.message || e}`);
      alert('Error. See logs/error-log.txt');
    }
  });
}

// Note: thumbs_up removed per user feedback; engine now uses palm-based swipes
// PPTX upload handler
const pptForm = document.getElementById('pptUploadForm');
if (pptForm) {
  pptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('pptFile').files[0];
    if (!file) { alert('Choose a .pptx file first'); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/ppt', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      alert('Upload and conversion complete. Loading slides...');
      // Reload deck by reinitializing slides content
      await slides._loadSlides();
    } catch (err) {
      alert('Upload failed: ' + (err?.message || err));
    }
  });
}
