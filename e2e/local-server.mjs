// Serves a build of this checkout for local end-to-end runs, the way Cloudflare Workers static assets serves it in
// production (wrangler.jsonc): _headers applied, _redirects followed, auto-trailing-slash (/play -> /play/,
// /play/index.html -> /play/), and /404.html with status 404 for anything missing. No proxy: the site loads nothing
// from another origin on its own.
//   python3 build.py --dev && node e2e/local-server.mjs [port] [dir]        (default 8124 and _dev: no stamps, 'dev' worker)
//   python3 build.py && node e2e/local-server.mjs 8124 _site                (what the deploy publishes, real worker)
//   python3 build.py --target moved && node e2e/local-server.mjs 8124 _moved /vedic-math/
//                                                                           (the Phase B moved page, served at /vedic-math/)
//   BASE_URL=http://localhost:8124 npx playwright test
// `npx wrangler dev` from deploy/ serves the same with Cloudflare's own code (Miniflare); this server needs no install.
// On plain http, upgrade-insecure-requests is left out of the policies (it would send localhost requests to https).
// POST /_csp answers 204, like worker/csp.js, without logging.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = +(process.argv[2] || process.env.PORT || 8124);
const root = path.resolve(repo, process.argv[3] || '_dev');
const prefix = process.argv[4] || '/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.m4a': 'audio/mp4', '.wasm': 'application/wasm', '.gz': 'application/gzip' };

/* _headers: "path" lines start a rule, indented "Name: value" lines add to it; a trailing * matches any rest */
async function rules(file) {
  const text = await readFile(path.join(root, file), 'utf8').catch(() => '');
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) out.push({ path: line.trim(), headers: [] });
    else if (out.length) { const i = line.indexOf(':'); out[out.length - 1].headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
  }
  return out;
}
const matches = (pattern, p) => (pattern.endsWith('*') ? p.startsWith(pattern.slice(0, -1)) : p === pattern);
const headersFile = await rules('_headers');
const redirects = (await readFile(path.join(root, '_redirects'), 'utf8').catch(() => '')).split('\n')
  .filter(l => l.trim() && !l.startsWith('#')).map(l => l.trim().split(/\s+/));

function send(res, status, file, body, urlPath) {
  const headers = { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' };
  for (const r of headersFile) {
    if (!matches(r.path, urlPath)) continue;
    for (const [k, v] of r.headers) {
      const key = k.toLowerCase();
      const value = key.startsWith('content-security-policy') ? v.replace(/;\s*upgrade-insecure-requests/, '') : v;
      headers[key] = headers[key] && key !== 'content-type' && key !== 'cache-control' ? `${headers[key]}, ${value}` : value; // Cloudflare joins repeats with a comma
    }
  }
  res.writeHead(status, headers);
  res.end(body);
}

async function find(rel) {
  const p = path.join(root, rel);
  const inside = path.relative(root, p);
  if (inside.startsWith('..') || path.isAbsolute(inside)) return null;
  const s = await stat(p).catch(() => null);
  return s ? { p, dir: s.isDirectory() } : null;
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/_csp') { res.writeHead(req.method === 'POST' ? 204 : 405); return res.end(); }
    for (const [from, to, code] of redirects) {
      if (matches(from, pathname)) { res.writeHead(+code || 302, { location: to + url.search }); return res.end(); }
    }
    if (!pathname.startsWith(prefix)) { res.writeHead(404); return res.end('Not found'); }
    // Normalized, so // and encoded ../ cannot reach outside the build; nothing starting with . or _ but .well-known
    const rel = path.posix.normalize('/' + pathname.slice(prefix.length));
    if (/\/[._](?!well-known\/)/.test(rel)) { res.writeHead(404); return res.end('Not found'); }
    const hit = await find(rel);
    if (hit && hit.dir && !rel.endsWith('/')) { res.writeHead(307, { location: pathname + '/' + url.search }); return res.end(); }
    if (rel.endsWith('/index.html')) { res.writeHead(307, { location: pathname.slice(0, -'index.html'.length) + url.search }); return res.end(); }
    const target = hit && (hit.dir ? path.join(hit.p, 'index.html') : hit.p);
    const body = target && await readFile(target).catch(() => null);
    if (body) return send(res, 200, target, body, pathname);
    const html = path.join(root, '404.html');
    const nf = await readFile(html).catch(() => null);
    if (nf) return send(res, 404, html, nf, pathname);
    res.writeHead(404); res.end('Not found');
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(port, () => console.log(`Learn Vedic Math (${path.relative(repo, root) || '.'}) on http://localhost:${port}${prefix}`));
