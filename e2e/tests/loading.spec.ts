import { test, expect, APP } from './fixtures';

/* Compressed and immutable delivery (openspec change render-performance, design D3, task 3.2, on the Legacy game):
   every same-origin script and stylesheet is loaded at ?v=<content hash>, a URL whose bytes never change, so the
   build's _headers (from shared/src/policy.json, immutable) marks their folders immutable for a year. The page, the
   worker, the fonts and the manifest keep the host's default, since their URLs stay the same across deploys. */
const IMMUTABLE = 'public, max-age=31536000, immutable';

test('a stamped module and stylesheet are immutable for a year; the page, the worker, a font and the manifest are not', async ({ page, request }) => {
  await page.goto(APP);
  const html = await page.content();
  const stamped = ['/js/app.js', '/math.css', '/ds/2.2.0/tokens.css', '/theme/fonts.css', '/js/analytics.js'].map(u => {
    const m = html.match(new RegExp(`${u.replace(/[./]/g, '\\$&')}\\?v=\\w+`));
    expect(m, `${u} is loaded with a ?v= stamp`).not.toBeNull();
    return m![0];
  });
  for (const u of stamped) {
    const res = await request.get(u);
    expect(res.status(), u).toBe(200);
    expect(res.headers()['cache-control'], u).toBe(IMMUTABLE);
  }
  for (const u of [APP, '/sw.js', '/manifest.webmanifest', '/fonts/nunito-sans-latin-wght-normal.woff2', '/icons/icon-192.png']) {
    const res = await request.get(u);
    expect(res.status(), u).toBe(200);
    expect(res.headers()['cache-control'] ?? '', `${u} keeps the host's default caching`).not.toContain('immutable');
  }
});
