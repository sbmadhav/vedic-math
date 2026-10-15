// Serves this checkout at /vedic-math/ for local end-to-end runs. Everything else (/design-system/,
// /assets/, /manifest.webmanifest, ...) comes from the live site, so the page runs exactly as on
// sbmadhav.com but with this branch's files.
//   node local-server.mjs [port]     (default 8124; 8000 is often taken)
//   BASE_URL=http://localhost:8124 npx playwright test
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = +(process.argv[2] || process.env.PORT || 8124);
const LIVE = 'https://sbmadhav.com';
const PREFIX = '/vedic-math/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
// Repo-only paths that GitHub Pages does not publish (see _config.yml exclude)
const BLOCKED = /^\/(e2e|test|cloud|node_modules|\.git|\.github|\.githooks)(\/|$)|^\/(CLAUDE|README)\.md$|^\/build\.py$|^\/_config\.yml$/;

async function proxy(req, res) {
  const r = await fetch(LIVE + req.url, { redirect: 'manual' });
  const headers = {};
  r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) headers[k] = v; });
  if (headers.location) headers.location = headers.location.replace(LIVE, '');
  res.writeHead(r.status, headers);
  res.end(Buffer.from(await r.arrayBuffer()));
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/vedic-math') { res.writeHead(301, { location: PREFIX + url.search }); return res.end(); }
    if (!pathname.startsWith(PREFIX)) return await proxy(req, res);
    const rel = '/' + pathname.slice(PREFIX.length);
    if (BLOCKED.test(rel)) { res.writeHead(404); return res.end('Not found'); }
    let p = path.join(root, rel);
    if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
    const s = await stat(p).catch(() => null);
    if (s && s.isDirectory()) p = path.join(p, 'index.html');
    const body = await readFile(p).catch(() => null);
    if (!body) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(port, () => console.log(`Vedic Math (this checkout) on http://localhost:${port}/vedic-math/`));
