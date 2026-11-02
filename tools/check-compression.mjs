/* Edge compression check (openspec change render-performance, design D3, task 3.1, on the Legacy game): the host must
   answer every text file with Brotli to a client that accepts it, and without it to one that does not. Full GETs read to
   the end, not HEADs, so the answer is the one a browser gets. Each Brotli answer must be a 200 of the content type its
   URL promises (a compressed 404 page carries content-encoding: br too and does not pass).

   What is checked, from the live game page: /play/ itself, the entry module at its stamped URL (the live import map's
   /js/app.js entry), the game stylesheet at its stamped URL and /sw.js; then the entry module again with
   Accept-Encoding: identity, which must not be Brotli. Vary: Accept-Encoding is printed for information: Cloudflare's
   edge does not send it to the client (it keys its own cache on the encoding), and the daily job does not fail on it.

   Usage: node tools/check-compression.mjs [base URL]   (default https://learnvedicmath.com); exit code 1 on a failure.
   Run by the daily E2E workflow (.github/workflows/e2e.yml, job compression). */
const base = (process.argv[2] || 'https://learnvedicmath.com').replace(/\/$/, '');

const TYPES = { html: /^text\/html\b/, js: /^(text|application)\/javascript\b/, css: /^text\/css\b/ };

async function get(path, encoding) {
  const res = await fetch(base + path, { headers: { 'Accept-Encoding': encoding, 'User-Agent': 'learnvedicmath-compression-check' }, redirect: 'manual' });
  const body = await res.arrayBuffer(); // read to the end: the answer a browser gets, streamed or not
  return { status: res.status, type: res.headers.get('content-type') || '', encoding: res.headers.get('content-encoding') || '', vary: res.headers.get('vary') || '', bytes: body.byteLength, text: () => new TextDecoder().decode(body) };
}

let failures = 0;
const fail = (msg) => { failures++; console.log(`::error::${msg}`); };
const row = (path, enc, r) => console.log(`${path.padEnd(44)} ${enc.padEnd(9)} ${String(r.status).padEnd(4)} ${r.type.padEnd(28)} ${(r.encoding || 'none').padEnd(6)} vary=${r.vary || 'none'} ${r.bytes} bytes decoded`);

/* A text file answered with Brotli, of the type its URL promises */
async function brotli(path, kind) {
  const r = await get(path, 'br');
  row(path, 'br', r);
  if (r.status !== 200) fail(`${path}: HTTP ${r.status}, expected 200`);
  if (!TYPES[kind].test(r.type)) fail(`${path}: content type ${r.type || 'none'}, expected ${kind}`);
  if (r.encoding !== 'br') fail(`${path}: content-encoding ${r.encoding || 'none'}, expected br (add a Cloudflare Compression Rule: docs/perf/baseline.md, "Compression and caching")`);
  return r;
}

const page = await brotli('/play/', 'html');
const html = page.text();
const map = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
const entry = map ? JSON.parse(map[1]).imports['/js/app.js'] : null;
if (!entry || !/\?v=\w+$/.test(entry)) fail('/play/: no stamped /js/app.js in the import map (is this a stamped build?)');
const css = html.match(/href="(\/math\.css\?v=\w+)"/)?.[1];
if (!css) fail('/play/: no stamped /math.css link');
if (entry) await brotli(entry, 'js');
if (css) await brotli(css, 'css');
await brotli('/sw.js', 'js');
if (entry) {
  const plain = await get(entry, 'identity');
  row(entry, 'identity', plain);
  if (plain.status !== 200) fail(`${entry}: HTTP ${plain.status} without Brotli, expected 200`);
  if (plain.encoding && plain.encoding !== 'identity') fail(`${entry}: content-encoding ${plain.encoding} to a client that asked for identity`);
}
console.log(failures ? `${failures} failure(s)` : 'Every text file is served with Brotli to a client that accepts it, and plain to one that does not.');
process.exit(failures ? 1 : 0);
