// Serves a build of this checkout for local end-to-end runs, the way Cloudflare Workers static assets serves it in
// production (wrangler.jsonc): _headers applied; _redirects followed (a redirect status sends the Location, 200 serves
// the target path's file under the request's own headers, a trailing * is a splat and :splat in the target is what it
// matched); auto-trailing-slash (/play -> /play/, /play/index.html -> /play/, foo.html at /foo with /foo/ and
// /foo.html redirected to it); and the nearest 404.html up from the requested path with status 404 for anything
// missing (/learn/404.html under /learn/, /404.html elsewhere). No proxy: the site loads nothing from another origin
// on its own.
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
/* What a pattern's splat matched ('' for an exact match), or null */
const splat = (pattern, p) => (pattern.endsWith('*') ? (p.startsWith(pattern.slice(0, -1)) ? p.slice(pattern.length - 1) : null) : p === pattern ? '' : null);
const headersFile = await rules('_headers');
const redirects = (await readFile(path.join(root, '_redirects'), 'utf8').catch(() => '')).split('\n')
  .filter(l => l.trim() && !l.startsWith('#')).map(l => l.trim().split(/\s+/));

/* The first _redirects rule a path matches: where it goes and with what status (200 is a rewrite) */
function redirectFor(pathname) {
  for (const [from, to, code] of redirects) {
    const rest = splat(from, pathname);
    if (rest !== null) return { to: to.replace(':splat', rest), status: +code || 302 };
  }
  return null;
}

function send(res, status, file, body, urlPath) {
  const headers = { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' };
  for (const r of headersFile) {
    if (splat(r.path, urlPath) === null) continue;
    for (const [k, v] of r.headers) {
      const key = k.toLowerCase();
      const value = key.startsWith('content-security-policy') ? v.replace(/;\s*upgrade-insecure-requests/, '') : v;
      headers[key] = headers[key] && key !== 'content-type' && key !== 'cache-control' ? `${headers[key]}, ${value}` : value; // Cloudflare joins repeats with a comma
    }
  }
  res.writeHead(status, headers);
  res.end(body);
}

/* The file at a path inside the build, or null */
async function file(rel) {
  const p = path.join(root, rel);
  const inside = path.relative(root, p);
  if (inside.startsWith('..') || path.isAbsolute(inside)) return null;
  const s = await stat(p).catch(() => null);
  return s && s.isFile() ? p : null;
}

/* Cloudflare's auto-trailing-slash (wrangler.jsonc html_handling): foo/index.html is served at /foo/ and foo.html at
   /foo; every other spelling of either (/foo, /foo/, /foo.html, /foo/index.html, /foo/index) redirects to that one.
   Returns { file } to serve, { to } to redirect to, or null for nothing at that path. */
async function resolve(rel) {
  if (rel.endsWith('/index.html')) return { to: rel.slice(0, -'index.html'.length) };
  if (rel.endsWith('/index') && await file(rel + '.html')) return { to: rel.slice(0, -'index'.length) };
  if (rel.endsWith('.html') && await file(rel)) return { to: rel.slice(0, -'.html'.length) };
  if (rel.endsWith('/')) {
    const index = await file(rel + 'index.html');
    if (index) return { file: index };
    return (await file(rel.slice(0, -1) + '.html')) ? { to: rel.slice(0, -1) } : null;
  }
  const exact = await file(rel);
  if (exact) return { file: exact };
  const html = await file(rel + '.html');
  if (html) return { file: html };
  return (await file(rel + '/index.html')) ? { to: rel + '/' } : null;
}

/* The nearest 404.html, from the requested path's folder up to the build's root (Cloudflare's 404-page handling) */
async function notFound(rel) {
  let dir = rel.endsWith('/') ? rel.slice(0, -1) : path.posix.dirname(rel);
  for (;;) {
    const f = await file(path.posix.join(dir || '/', '404.html'));
    if (f) return f;
    if (!dir || dir === '/') return null;
    dir = path.posix.dirname(dir);
  }
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/_csp') { res.writeHead(req.method === 'POST' ? 204 : 405); return res.end(); }
    const rule = redirectFor(pathname);
    if (rule && rule.status !== 200) { res.writeHead(rule.status, { location: rule.to + url.search }); return res.end(); }
    const served = rule ? rule.to : pathname; // a 200 rewrite serves another path's file, under this path's headers
    if (!served.startsWith(prefix)) { res.writeHead(404); return res.end('Not found'); }
    // Normalized, so // and encoded ../ cannot reach outside the build; nothing starting with . or _ but .well-known
    const rel = path.posix.normalize('/' + served.slice(prefix.length));
    const hit = /\/[._](?!well-known\/)/.test(rel) ? null : await resolve(rel);
    if (hit && hit.to) { res.writeHead(307, { location: prefix.slice(0, -1) + hit.to + url.search }); return res.end(); }
    const body = hit && await readFile(hit.file).catch(() => null);
    if (body) return send(res, 200, hit.file, body, pathname);
    const nf = await notFound(rel);
    const page = nf && await readFile(nf).catch(() => null);
    if (page) return send(res, 404, nf, page, pathname);
    res.writeHead(404); res.end('Not found');
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(port, () => console.log(`Learn Vedic Math (${path.relative(repo, root) || '.'}) on http://localhost:${port}${prefix}`));
