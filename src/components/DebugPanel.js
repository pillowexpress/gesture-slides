export function DebugPanel() {
  const el = document.createElement('div');
  el.id = 'debug-panel';
  el.style.cssText = `
    position: fixed; bottom: 10px; right: 10px; z-index: 9999;
    background: rgba(0,0,0,0.7); color: #0f0; padding: 8px 12px; font-family: monospace;
    display: none; min-width: 300px; border: 1px solid #0f0; border-radius: 6px; font-size: 12px;
    max-height: 50vh; overflow: auto;
  `;
  el.innerHTML = `
    <div><strong>Debug Panel</strong> (press D to toggle)</div>
    <div>Gesture: <span id="dbg-gesture">-</span></div>
    <div>Confidence: <span id="dbg-confidence">-</span></div>
    <div>Slide: <span id="dbg-slide">-</span></div>
    <div>Errors: <span id="dbg-errors">0</span></div>
    <div>FPS: <span id="dbg-fps">-</span></div>
    <div>History (last 5):<ul id="dbg-history" style="margin:4px 0 0 16px;padding:0"></ul></div>
    <div>Pointer: <span id="dbg-pointer">off</span></div>
  `;
  document.body.appendChild(el);

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  });

  function setHistory(history) {
    const ul = document.getElementById('dbg-history');
    ul.innerHTML = '';
    (history || []).slice(-5).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${new Date(item.t).toLocaleTimeString()} - ${item.name} (${item.confidence.toFixed(2)})`;
      ul.appendChild(li);
    });
  }

  return {
    update({ gesture, confidence, slide, errors, fps, history, pointer }) {
      if (gesture !== undefined) document.getElementById('dbg-gesture').textContent = gesture;
      if (confidence !== undefined) document.getElementById('dbg-confidence').textContent = String(confidence);
      if (slide !== undefined) document.getElementById('dbg-slide').textContent = String(slide);
      if (errors !== undefined) document.getElementById('dbg-errors').textContent = String(errors);
      if (fps !== undefined) document.getElementById('dbg-fps').textContent = String(fps);
      if (pointer !== undefined) document.getElementById('dbg-pointer').textContent = pointer ? 'on' : 'off';
      if (history !== undefined) setHistory(history);
    }
  }
}
