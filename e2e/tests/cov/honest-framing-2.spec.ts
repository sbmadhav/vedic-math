import { test, expect, open, APP } from '../fixtures';

/* honest-framing spec, "No claim of a Vedic source", scenario "Copy scan".
   WHEN the shipped HTML and every string in the app's scripts are scanned, THEN none contains "from the Vedas"
   (outside the history text that says they are not), "traditional Vedic mathematics sutras" or "Vedic sutras".
   test/copy.test.mjs scans the source files on disk; these tests scan what the server actually ships: the page,
   the manifest and every module reachable from js/app.js (static imports, dynamic import() and
   import.meta.resolve workers), plus the text a Player sees on every top-level route. */

const BANNED = [/vedic sutras?\b/i, /traditional vedic mathematics sutras/i, /from the vedas/i];
/* The history text may name the Vedas to say the sutras are NOT in them */
const IN_VEDAS = /(from|in) the vedas/i;
const denies = (sentence: string) => /\bnot\b|\bnever\b/i.test(sentence);

function scan(label: string, text: string): string[] {
  const hits: string[] = [];
  for (const re of BANNED) {
    for (const m of text.matchAll(new RegExp(re.source, 'gi'))) {
      const i = m.index ?? 0;
      const start = Math.max(text.lastIndexOf('.', i) + 1, text.lastIndexOf('\n', i) + 1);
      const endDot = text.indexOf('.', i);
      const sentence = text.slice(start, endDot < 0 ? undefined : endDot);
      if (/from the vedas/i.test(m[0]) && denies(sentence)) continue;
      hits.push(`${label}: "${sentence.trim().slice(0, 140)}"`);
    }
  }
  return hits;
}

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|import\.meta\.resolve\(\s*)['"]([^'"]+\.js)['"]/g;

test('the shipped HTML, manifest and every app script make no Vedic-source claim', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const get = async (url: string) => {
    const r = await page.request.get(url);
    expect(r.ok(), `GET ${url}`).toBeTruthy();
    return r.text();
  };

  const html = await get(`${origin}${APP}`);
  const hits = scan('index.html', html);

  const manifestHref = html.match(/<link[^>]+rel=["']manifest["'][^>]*href=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']manifest["']/i)?.[1];
  expect(manifestHref, 'index.html links a manifest').toBeTruthy();
  const manifestUrl = new URL(manifestHref!, `${origin}${APP}`).href;
  hits.push(...scan('manifest', await get(manifestUrl)));

  // Entry scripts on the page, then every module they reach
  const entries = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => new URL(m[1], `${origin}${APP}`).href)
    .filter(u => new URL(u).pathname.startsWith(`${APP}js/`));
  expect(entries.length, 'index.html loads the app entry script').toBeGreaterThan(0);
  const seen = new Set<string>();
  const queue = entries.map(u => u.split('?')[0]);
  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const src = await get(url);
    hits.push(...scan(new URL(url).pathname, src));
    for (const m of src.matchAll(SPECIFIER)) {
      const next = new URL(m[1], url).href.split('?')[0];
      if (new URL(next).pathname.startsWith(`${APP}js/`) && !seen.has(next)) queue.push(next);
    }
  }
  const paths = [...seen].map(u => new URL(u).pathname);
  // The crawl really reached the app: the entry, lazy modules, the skills and the voice worker
  for (const f of ['app.js', 'sutras.js', 'videos.js', 'skills/index.js', 'voice-worker.js']) {
    expect(paths, `scanned ${f}`).toContain(`${APP}js/${f}`);
  }
  expect(hits).toEqual([]);
});

test('the history text names the Vedas only to say the sutras are not in them', async ({ page }) => {
  await open(page, '#/sutras');
  const text = await page.locator('#view').innerText();
  expect(text).toMatch(/do not appear in the Vedas/i);
  for (const sentence of text.split(/(?<=[.!?])\s+|\n/).filter(s => IN_VEDAS.test(s))) {
    expect(denies(sentence), `"${sentence}" denies a Vedic source`).toBe(true);
  }
});

const ROUTES = ['#/', '#/learn', '#/dojo', '#/arena', '#/games', '#/sutras', '#/watch', '#/me', '#/tower', '#/duel'];

test('no page a Player sees calls them the Vedic sutras or claims they are from the Vedas', async ({ page }) => {
  const hits: string[] = [];
  for (const hash of ROUTES) {
    await open(page, hash);
    const text = await page.locator('body').innerText();
    hits.push(...scan(hash, text));
    const title = await page.title();
    hits.push(...scan(`${hash} <title>`, title));
    const meta = await page.locator('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]')
      .evaluateAll(els => els.map(e => e.getAttribute('content') || '').join('\n'));
    hits.push(...scan(`${hash} meta`, meta));
  }
  expect(hits).toEqual([]);
});
