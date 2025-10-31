import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export function cleanSlides() {
  try {
    const mdPath = path.join(root, 'public', 'slides', 'deck.md');
    const imagesDir = path.join(root, 'public', 'slides', 'images');
    if (fs.existsSync(mdPath)) {
      try { fs.unlinkSync(mdPath); } catch {}
    }
    if (fs.existsSync(imagesDir)) {
      try {
        for (const f of fs.readdirSync(imagesDir)) {
          try { fs.unlinkSync(path.join(imagesDir, f)); } catch {}
        }
      } catch {}
    } else {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
  } catch (e) {
    // silently ignore
  }
}
