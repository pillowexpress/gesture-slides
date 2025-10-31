import fs from 'fs';
import path from 'path';
import url from 'url';
import Busboy from 'busboy';
import { spawn } from 'child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');
const publicSlides = path.join(root, 'public', 'slides');
const publicSlidesImages = path.join(publicSlides, 'images');
const mdOutPath = path.join(publicSlides, 'deck.md');
const jsonOutPath = path.join(publicSlides, 'deck.json');
const pyScript = path.join(root, 'scripts', 'convert_pptx_to_images.py');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(publicSlidesImages)) fs.mkdirSync(publicSlidesImages, { recursive: true });

function logError(message) {
  try {
    const logPath = path.join(root, 'logs', 'error-log.txt');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch {}
}

export function handleUploadPPT(req, res) {
  try {
    if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return; }

    const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 150 * 1024 * 1024 } });
    let uploadedPath = null;

    bb.on('file', (name, file, info) => {
      const { filename } = info;
      const savePath = path.join(uploadsDir, Date.now() + '-' + filename);
      uploadedPath = savePath;
      file.pipe(fs.createWriteStream(savePath));
    });

    bb.on('error', (err) => {
      logError('Upload parse error: ' + (err?.stack || err));
      try { res.writeHead(500); res.end('Upload parser error'); } catch {}
    });

    bb.on('close', async () => {
      if (!uploadedPath) { res.writeHead(400); res.end('No file'); return; }
      try {
        // Cleanup previous deck and images
        try {
          if (fs.existsSync(mdOutPath)) fs.unlinkSync(mdOutPath);
          if (fs.existsSync(jsonOutPath)) fs.unlinkSync(jsonOutPath);
          if (fs.existsSync(publicSlidesImages)) {
            for (const f of fs.readdirSync(publicSlidesImages)) fs.unlinkSync(path.join(publicSlidesImages, f));
          } else {
            fs.mkdirSync(publicSlidesImages, { recursive: true });
          }
        } catch (e) { logError('Cleanup before convert failed: ' + (e?.message || e)); }

        const ok = await convertWithPython(uploadedPath, publicSlidesImages, mdOutPath, jsonOutPath);
        if (!ok) { res.writeHead(500); res.end('Conversion failed - ensure Python + dependencies installed'); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        logError('Upload handler error: ' + (e?.stack || e));
        res.writeHead(500); res.end('Error: ' + (e?.message || e));
      }
    });

    req.pipe(bb);
  } catch (e) {
    logError('Upload fatal error: ' + (e?.stack || e));
    res.writeHead(500); res.end('Upload error: ' + (e?.message || e));
  }
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: false, ...options });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('close', code => {
      if (code === 0) resolve({ out, err }); else reject(new Error(err || out || `Exit ${code}`));
    });
  });
}

async function convertWithPython(pptxPath, outDir, mdOut, jsonOut) {
  try {
    // Prefer 'python' then 'py' (Windows launcher)
    let pyCmd = 'python';
    try { await run(pyCmd, ['--version']); } catch { pyCmd = 'py'; }
    // Ensure requirements installed (idempotent)
    const reqFile = path.join(root, 'scripts', 'requirements.txt');
    if (fs.existsSync(reqFile)) {
      try { await run(pyCmd, ['-m', 'pip', 'install', '-r', reqFile], { cwd: path.join(root, 'scripts') }); } catch (e) {
        logError('pip install failed: ' + (e?.message || e));
      }
    }

    const args = [pyScript, '--in', pptxPath, '--out', outDir, '--md', mdOut, '--json', jsonOut];
    const { out, err } = await run(pyCmd, args, { cwd: path.join(root, 'scripts') });
    if (out) logError('Python converter output: ' + out.trim());
    if (err) logError('Python converter stderr: ' + err.trim());

    const mdExists = fs.existsSync(mdOut);
    return mdExists;
  } catch (e) {
    logError('Python conversion failed: ' + (e?.stack || e));
    return false;
  }
}
