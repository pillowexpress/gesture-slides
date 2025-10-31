import { Logger } from '../utils/logger.js';
import { marked } from 'marked';

export class SlideController {
  constructor() {
    this.initialized = false;
    this.reveal = null;
    this.pointerEnabled = false;
    this.pointerEl = null;
    Logger.build('SlideController created');
  }

  _ensureRevealCss() {
    const ensureCss = (href) => {
      if (![...document.styleSheets].some(s => s.href && s.href.includes('reveal'))) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    };
    ensureCss('https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css');
    ensureCss('https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css');
  }

  async _loadReveal() {
    try {
      const mod = await import('reveal.js');
      const Reveal = mod?.default || mod;
      if (!Reveal) throw new Error('Invalid reveal.js export');
      this._ensureRevealCss();
      return Reveal;
    } catch (e) {
      Logger.error(`Bare import of reveal.js failed, using CDN fallback: ${e?.message || e}`);
      this._ensureRevealCss();
      const mod = await import('https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.esm.js');
      const Reveal = mod?.default || mod?.Reveal || mod;
      if (!Reveal) throw new Error('CDN reveal.esm.js did not export a constructor');
      return Reveal;
    }
  }

  async init() {
    try {
      const Reveal = await this._loadReveal();
      // Keep defaults, disable centering; we control layout per slide
      const deck = new Reveal({ hash: true, slideNumber: true, transition: 'slide', center: false });
      await deck.initialize();
      this.reveal = deck;
      this.initialized = true;
      Logger.build('SlideController initialized (Reveal)');
      await this._loadSlides();
      setTimeout(() => { try { this.reveal.layout(); } catch(_){} }, 0);
    } catch (e) {
      Logger.error(`SlideController.init error: ${e?.message || e}`);
      throw e;
    }
  }

  async _loadSlides() {
    try {
      const res = await fetch('/api/slides');
      if (res.ok) {
        const { markdown } = await res.json();
        if (markdown) {
          const mdRes = await fetch('/slides/deck.md');
          if (mdRes.ok) {
            const md = await mdRes.text();
            this._renderMarkdownResponsive(md);
            return;
          }
        }
        Logger.build('Markdown deck not found; using placeholder slides');
      }
    } catch (e) {
      Logger.error('Failed to load slides: ' + (e?.message || e));
    }
  }

  _injectLayoutCss() {
    // Always replace to avoid stale/duplicate rules
    const prev = document.getElementById('gs-layout-style');
    if (prev) prev.remove();
    const st = document.createElement('style');
    st.id = 'gs-layout-style';
    st.textContent = `
      .gs-slide { width: 100%; box-sizing: border-box; padding: 2vh 3vw; }
      .gs-header { margin-bottom: 12px; }
      .gs-row { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; align-items: start; width: 100%; }
      .gs-body { }
      .gs-images { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
      .reveal .slides .gs-images img { max-width: 100% !important; height: auto !important; object-fit: contain !important; display: block; }
      .gs-single { width: 100%; box-sizing: border-box; padding: 3vh 3vw; }
      @media (max-width: 1024px) {
        .gs-row { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(st);
  }

  _renderMarkdownResponsive(md) {
    const container = document.querySelector('.reveal .slides');
    if (!container) return;

    this._injectLayoutCss();

    const slides = md.split(/^---$/m).map(s => s.trim()).filter(Boolean);

    const htmlSections = slides.map((section) => {
      const lines = section.split(/\r?\n/);
      const imageLines = lines.filter(l => /^\s*!\[.*\]\(.*\)\s*$/.test(l));
      const nonImageLines = lines.filter(l => !/^\s*!\[.*\]\(.*\)\s*$/.test(l));

      // Title: first heading (# ...) if present, otherwise first non-image line
      let headerLine = '';
      let bodyLines = [];
      if (nonImageLines.length) {
        const idx = nonImageLines.findIndex(l => /^\s*#\s+.+/.test(l));
        if (idx >= 0) {
          headerLine = nonImageLines[idx];
          bodyLines = nonImageLines.slice(0, idx).concat(nonImageLines.slice(idx + 1));
        } else {
          headerLine = nonImageLines[0];
          bodyLines = nonImageLines.slice(1);
        }
      }

      const headerHtml = headerLine ? marked.parse(headerLine, { mangle: false, headerIds: true }) : '';
      const bodyHtml = bodyLines.length ? marked.parse(bodyLines.join('\n'), { mangle: false, headerIds: true }) : '';
      const imagesHtml = imageLines.map(l => marked.parse(l, { mangle: false, headerIds: false })).join('');

      if (imageLines.length === 0) {
        // No images: full-width text slide
        return `
          <section>
            <div class="gs-single">
              <div class="gs-header">${headerHtml}</div>
              <div class="gs-body">${bodyHtml}</div>
            </div>
          </section>
        `;
      }

      return `
        <section>
          <div class="gs-slide">
            <div class="gs-header">${headerHtml}</div>
            <div class="gs-row">
              <div class="gs-body">${bodyHtml}</div>
              <div class="gs-images">${imagesHtml}</div>
            </div>
          </div>
        </section>
      `;
    }).join('');

    container.innerHTML = htmlSections;

    // Ensure Reveal recalculates sizes
    try { this.reveal?.sync?.(); this.reveal?.layout?.(); } catch(_) {}
  }

  next() { try { this.reveal?.right(); } catch(e){ Logger.error('next failed: '+e);} }
  prev() { try { this.reveal?.left(); } catch(e){ Logger.error('prev failed: '+e);} }
  start() { try { this.reveal?.slide(0,0); } catch(e){ Logger.error('start failed: '+e);} }

  pauseNotes() {
    let notes = document.getElementById('speaker-notes');
    if (!notes) {
      notes = document.createElement('div');
      notes.id = 'speaker-notes';
      notes.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);color:#fff;padding:10px;z-index:9999;';
      notes.innerHTML = '<strong>Speaker Notes</strong><div>Notes go here...</div>';
      document.body.appendChild(notes);
    } else {
      notes.remove();
    }
  }

  pointerMode(enable=true) {
    this.pointerEnabled = !!enable;
    if (this.pointerEnabled) {
      if (!this.pointerEl) {
        this.pointerEl = document.createElement('div');
        this.pointerEl.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:7px;background:red;pointer-events:none;z-index:9999;';
        document.body.appendChild(this.pointerEl);
      }
    } else if (this.pointerEl) {
      this.pointerEl.remove();
      this.pointerEl = null;
    }
  }

  movePointer(x, y) {
    if (!this.pointerEnabled || !this.pointerEl) return;
    this.pointerEl.style.left = `${x-7}px`;
    this.pointerEl.style.top = `${y-7}px`;
  }
}
