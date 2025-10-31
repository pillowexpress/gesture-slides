import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { handleLogRoute } from './logger.js';
import { cleanSlides } from './cleanup.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const port = process.env.PORT || 5174;

function logBuild(message) {
  try {
    const logPath = path.join(root, 'logs', 'build-log.txt');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (e) {
    console.error('Failed to write build log:', e);
  }
}

function logError(message) {
  try {
    const logPath = path.join(root, 'logs', 'error-log.txt');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (e) {
    console.error('Failed to write error log:', e);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/__log')) {
      handleLogRoute(req, res);
      return;
    }
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }

    const parsedUrl = url.parse(req.url);

    if (req.url.startsWith('/api/upload/ppt')) {
      const { handleUploadPPT } = await import('./upload.js');
      return handleUploadPPT(req, res);
    }

    if (req.url.startsWith('/api/slides/reset')) {
      cleanSlides();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url.startsWith('/api/slides')) {
      const { handleSlidesRoute } = await import('./slides.js');
      return handleSlidesRoute(req, res);
    }

    let pathname = `${root}${parsedUrl.pathname}`;
    if (parsedUrl.pathname === '/') {
      // Persist current slides across reloads; do not auto-clean here
      pathname = path.join(root, 'index.html');
    }

    const ext = path.parse(pathname).ext || '.html';
    const map = {
      '.ico': 'image/x-icon',
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    fs.exists(pathname, function (exist) {
      if (!exist) {
        res.statusCode = 404;
        res.end(`File ${pathname} not found!`);
        return;
      }

      if (fs.statSync(pathname).isDirectory()) pathname = path.join(pathname, 'index.html');

      fs.readFile(pathname, function (err, data) {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          res.setHeader('Content-type', map[ext] || 'text/plain');
          res.end(data);
        }
      });
    });
  } catch (e) {
    logError(`SERVER handler error: ${e?.stack || e}`);
    try {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    } catch {}
  }
});

server.listen(parseInt(port), () => {
  console.log(`Server listening on http://localhost:${port}`);
  logBuild(`DEV SERVER: started on http://localhost}:${port}`);
});
