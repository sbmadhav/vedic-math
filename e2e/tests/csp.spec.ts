import { test, expect, APP, open, cloudLog, showWorld } from './fixtures';
import type { Page } from '@playwright/test';

/* Content-Security-Policy (openspec content-security, change learnvedicmath). build.py writes each page's policy into
   _headers, with the sha256 of every inline script (the import map too); Cloudflare sends it as a response header.
   These tests use every main route the way a Player does and fail on any securitypolicyviolation event.

   Run them against production, a preview, `npx wrangler dev` or a local build served with its _headers:
     python3 build.py && node e2e/local-server.mjs 8124 _site
     BASE_URL=http://localhost:8124 npx playwright test csp
   A server that sends no policy skips them on http; on https the policy must be there.
   The fixtures still apply: the Firebase SDK is the in-page fake (served at its /vendor/firebase/ URL, so script-src
   is checked), YouTube is answered with an empty page, and GoatCounter is answered locally. */

type Violation = { directive: string; blocked: string; source: string };

async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
      // The stricter Report-Only policy reports (style="" and Trusted Types); only the enforced policy blocks
      if (e.disposition === 'report') return;
      w.__csp.push({ directive: e.effectiveDirective || e.violatedDirective, blocked: e.blockedURI, source: `${e.sourceFile}:${e.lineNumber}` });
    });
  });
  const console: string[] = [];
  // A blocked frame or worker is sometimes only reported in the console
  page.on('console', m => { if (/Content.Security.Policy|Refused to/i.test(m.text()) && !/report.only/i.test(m.text())) console.push(m.text()); });
  return { console, list: () => page.evaluate(() => ((window as any).__csp || []) as Violation[]) };
}

async function expectNoViolations(page: Page, v: Awaited<ReturnType<typeof watchViolations>>, where: string) {
  expect(await v.list(), `securitypolicyviolation events on ${where}`).toEqual([]);
  expect(v.console, `CSP console messages on ${where}`).toEqual([]);
}

/** The policy the page was served with (its response header); skips only a plain http server that sends none. */
async function policy(page: Page, baseURL?: string) {
  const res = await page.request.get(new URL(page.url()).pathname);
  const csp = res.headers()['content-security-policy'];
  if (!csp && !/^https:/.test(baseURL || '')) test.skip(true, 'This server sends no policy: serve a build with its _headers (node e2e/local-server.mjs 8124 _site)');
  expect(csp, 'the page is sent with a Content-Security-Policy header').toBeTruthy();
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]'), 'no policy <meta>: one policy, in the header').toHaveCount(0);
  return csp!;
}

async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
}

test.beforeEach(async ({ page }) => { await noYouTube(page); });

test('main routes render with no CSP violation', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const v = await watchViolations(page);
  await open(page);
  const csp = await policy(page, baseURL);
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain('report-to csp');
  // The hashed inline scripts ran: the color scheme button works, and the import map resolved the modules
  await page.emulateMedia({ colorScheme: 'light' });
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);

  for (const hash of ['#/learn', '#/dojo', '#/games', '#/game/times-sprint', '#/sutras', '#/me', '#/skill/3-mult', '#/grade/3', '#/star/sq5/1']) {
    await page.goto(`${APP}${hash}`);
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  }
  await expectNoViolations(page, v, 'the main routes');
});

test('every play experience page renders with no CSP violation', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const v = await watchViolations(page);
  await open(page, '#/games');
  await policy(page, baseURL);
  // The twelve pages (js/play/catalog.js); each loads its module and stylesheet on demand
  for (const hash of ['#/dojo/spells', '#/dojo/locks', '#/arena/party', '#/arena/ghosts', '#/arena/daily-number', '#/games/tala', '#/games/art',
    '#/games/wall', '#/games/apprentice', '#/games/bets', '#/games/lens', '#/sutras/lost-scroll']) {
    await page.goto(`${APP}${hash}`);
    await expect(page.locator('#view h1').first()).toBeVisible();
    await expect(page.locator('link[data-play="base"]')).toHaveCount(1);
  }
  await expectNoViolations(page, v, 'the play experiences');
});

test('Math Lens offers the camera under the published policy: its digit reader is served from this site', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page, '#/games/lens');
  const csp = await policy(page, baseURL);
  expect(csp).toMatch(/script-src[^;]*'wasm-unsafe-eval'/);
  expect(csp).not.toContain('cdn.jsdelivr.net');
  expect(csp).toMatch(/worker-src 'self'(;|$)/);
  const cam = page.locator('[data-way="camera"]');
  await expect(cam).toBeEnabled();
  await page.locator('[data-way="type"]').click();
  await expect(page.locator('#lnDigits')).toBeFocused();
  await expectNoViolations(page, v, '#/games/lens');
});

test.describe('a Player 13 or over', () => {
  test.use({ seedConsent: { age: 'adult' } });
test('Arena World boards load the Firebase SDK from this site with no CSP violation', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page, '#/arena');
  await policy(page, baseURL);
  await showWorld(page, '#lbDay');
  await expect.poll(async () => (await cloudLog(page)).reads.length, { message: 'the World board read through the (fake) SDK' }).toBeGreaterThan(0);
  await expectNoViolations(page, v, '#/arena');
});
});

test('the Watch shelf shows thumbnails and plays a video in the page with no CSP violation', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page, '#/watch');
  await policy(page, baseURL);
  const card = page.locator('#view button.watch-card').first();
  await expect(card).toBeVisible();
  await expect.poll(() => card.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  await card.click();
  const frame = page.locator('dialog.vm-player iframe');
  await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  await expect.poll(() => page.frames().some(f => /youtube-nocookie\.com/.test(f.url()))).toBe(true);
  await expectNoViolations(page, v, '#/watch');
});

test('the natural voice worker and GoatCounter run with no CSP violation', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  // The voice worker, started the way js/voice.js starts it (from its import map URL), without asking it to
  // download the model
  const started = await page.evaluate(() => new Promise<string>(resolve => {
    const map = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || '{"imports":{}}').imports;
    const url = map['/js/voice-worker.js'] || '/js/voice-worker.js';
    try {
      const w = new Worker(url, { type: 'module' });
      w.onerror = e => resolve('error: ' + (e.message || 'worker failed'));
      // An unloaded worker answers a gen with genError 'not loaded': that reply proves it started
      w.onmessage = e => { if (e.data?.type === 'genError' && e.data.id === 'csp-probe') { w.terminate(); resolve('ok'); } };
      w.postMessage({ type: 'gen', id: 'csp-probe', text: '' });
      setTimeout(() => { w.terminate(); resolve('no reply from the worker'); }, 10_000);
    } catch (e) { resolve('threw: ' + e); }
  }));
  expect(started).toBe('ok');
  // GoatCounter as js/analytics.js uses it (analytics is off on localhost): the vendored count.js, then one
  // request of each kind its beacon uses. The fixtures answer goatcounter.com locally and count.js is the
  // fixtures' no-op, so nothing is counted.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/vendor/goatcounter/count.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('count.js did not load'));
    document.head.appendChild(s);
  }));
  await page.evaluate(() => {
    navigator.sendBeacon('https://learnvedicmath.goatcounter.com/count?e2e=csp');
    new Image().src = 'https://learnvedicmath.goatcounter.com/count?e2e=csp-img';
  });
  await page.waitForTimeout(1000);
  await expectNoViolations(page, v, 'the voice worker and analytics');
});

test('the probe catches a violation (negative control)', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__inline = 1'; document.body.appendChild(s); });
  await expect.poll(async () => (await v.list()).map(x => x.directive).join(' ')).toMatch(/script-src/);
  expect(await page.evaluate(() => (window as any).__inline)).toBeUndefined();
});
