const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

// Check if production build in dist exists
const distDir = path.join(__dirname, 'dist');
const hasDist = fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'));
const primaryDir = hasDist ? distDir : __dirname;
const publicDir = path.join(__dirname, 'public');

function safeResolve(baseDir, requestPath) {
  const safePath = path.normalize(requestPath).replace(/^(\.\.[\/\\])+/, '');
  return path.join(baseDir, safePath);
}

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  // Health check
  if (pathname === '/health' || pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // Determine potential file path
  let candidateFile = null;

  if (pathname === '/' || pathname === '') {
    candidateFile = path.join(primaryDir, 'index.html');
  } else {
    // 1. Check in primaryDir (dist or root)
    const p1 = safeResolve(primaryDir, pathname);
    if (fs.existsSync(p1) && fs.statSync(p1).isFile()) {
      candidateFile = p1;
    }
    // 2. Check in publicDir
    if (!candidateFile && fs.existsSync(publicDir)) {
      const p2 = safeResolve(publicDir, pathname);
      if (fs.existsSync(p2) && fs.statSync(p2).isFile()) {
        candidateFile = p2;
      }
    }
    // 3. Check in root dir
    if (!candidateFile) {
      const p3 = safeResolve(__dirname, pathname);
      if (fs.existsSync(p3) && fs.statSync(p3).isFile()) {
        candidateFile = p3;
      }
    }
  }

  // SPA fallback for HTML requests or unmatched routes
  if (!candidateFile) {
    const indexPath = path.join(primaryDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      candidateFile = indexPath;
    } else {
      const rootIndex = path.join(__dirname, 'index.html');
      if (fs.existsSync(rootIndex)) {
        candidateFile = rootIndex;
      }
    }
  }

  if (candidateFile && fs.existsSync(candidateFile)) {
    const ext = path.extname(candidateFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(candidateFile);

    const baseName = path.basename(candidateFile).toLowerCase();
    const isNoCache = (
      ext === '.html' ||
      ext === '.webmanifest' ||
      baseName === 'sw.js' ||
      baseName === 'sw-custom.js' ||
      baseName === 'manifest.json'
    );

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': isNoCache ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable'
    });

    const stream = fs.createReadStream(candidateFile);
    stream.pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mainstay Drink POS server running on http://${HOST}:${PORT}`);
});
