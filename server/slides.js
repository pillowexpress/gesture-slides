import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function handleSlidesRoute(_req, res) {
  try {
    const mdPath = path.join(publicDir, 'slides', 'deck.md');
    const imagesDir = path.join(publicDir, 'slides', 'images');
    const result = { images: [], markdown: false };
    if (fs.existsSync(mdPath)) {
      result.markdown = true;
    }
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir)
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .sort(naturalCompare)
        .map(f => `/slides/images/${f}`);
      result.images = files;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e?.message || String(e) }));
  }
}
