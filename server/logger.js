import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logsDir = path.join(root, 'logs');

export function handleLogRoute(req, res) {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const file = urlObj.searchParams.get('file');
    const line = urlObj.searchParams.get('line');
    if (!file || !line) {
      res.writeHead(400); res.end('Missing params'); return;
    }
    const safe = ['build-log.txt','gesture-debug.txt','error-log.txt','display-debug.txt'];
    if (!safe.includes(file)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.appendFileSync(path.join(logsDir, file), line + '\n');
    res.writeHead(200); res.end('ok');
  } catch (e) {
    res.writeHead(500); res.end('log error');
  }
}
