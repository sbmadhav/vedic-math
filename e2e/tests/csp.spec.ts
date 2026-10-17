import { test, expect, APP, open, cloudLog } from './fixtures';
import type { Page } from '@playwright/test';

/* Content-Security-Policy (openspec content-security). build.py writes a <meta http-equiv="Content-Security-Policy">
   into the published index.html, with the sha256 of every inline script (the import map too). These tests use
   every main route the way a Player does and fail on any securitypolicyviolation event.

   The policy exists only in the build, so run them against the live site or a local build:
     python3 build.py --out _site && node e2e/local-server.mjs 8124 _site
     BASE_URL=http://localhost:8124 npx playwright test csp
   Served from the plain checkout (no policy) they skip; on https the policy must be there.
   The fixtures still apply: the Firebase SDK is the in-page fake (served from its real gstatic URL, so
   script-src is checked), YouTube is answered with an empty page, and GoatCounter is answered locally. */

type Violation = { directive: string; blocked: string; source: string };

async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
      w.__csp.push({ directive: e.effectiveDirective || e.violatedDirective, blocked: e.blockedURI, source: `${e.sourceFile}:${e.lineNumber}` });
    });
  });
  const console: string[] = [];
  // A blocked frame or worker is sometimes only reported in the console
  page.on('console', m => { if (/Content.Security.Policy|Refused to/i.test(m.text())) console.push(m.text()); });
  return { console, list: () => page.evaluate(() => ((window as any).__csp || []) as Violation[]) };
}

async function expectNoViolations(page: Page, v: Awaited<ReturnType<typeof watchViolations>>, where: string) {
  expect(await v.list(), `securitypolicyviolation events on ${where}`).toEqual([]);
  expect(v.console, `CSP console messages on ${where}`).toEqual([]);
}

/** The page's policy; skips when a plain local checkout has none. */
async function policy(page: Page, baseURL?: string) {
  const meta = page.locator('meta[http-equiv="Content-Security-Policy"]');
  if (!/^https:/.test(baseURL || '') && await meta.count() === 0) test.skip(true, 'No CSP in the unbuilt source: serve a build (node e2e/local-server.mjs 8124 _site)');
  await expect(meta, 'the build adds a CSP <meta>').toHaveCount(1);
  return (await meta.getAttribute('content'))!;
}

async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
}

test.beforeEach(async ({ page }) => { await noYouTube(page); });

test('main routes render with no CSP violation', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const v = await watchViolations(page);
  await open(page);
  const csp = await policy(page, baseURL);
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).toContain("object-src 'none'");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
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

test('Arena World boards load the Firebase SDK from gstatic with no CSP violation', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page, '#/arena');
  await policy(page, baseURL);
  await expect(page.locator('#lbDay [data-src="world"]')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => (await cloudLog(page)).reads.length, { message: 'the World board read through the (fake) SDK' }).toBeGreaterThan(0);
  await expectNoViolations(page, v, '#/arena');
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

test('the Explore menu, the natural voice worker and GoatCounter run with no CSP violation', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  await page.locator('#exploreBtn').click();
  await expect(page.locator('dialog.xpm')).toBeVisible();
  await page.keyboard.press('Escape');
  // The voice worker, started the way js/voice.js starts it (from its import map URL), without asking it to
  // download the model
  const started = await page.evaluate(() => new Promise<string>(resolve => {
    const map = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || '{"imports":{}}').imports;
    const url = map['/vedic-math/js/voice-worker.js'] || '/vedic-math/js/voice-worker.js';
    try {
      const w = new Worker(url, { type: 'module' });
      w.onerror = e => resolve('error: ' + (e.message || 'worker failed'));
      w.postMessage({ type: 'clear' });
      setTimeout(() => { w.terminate(); resolve('ok'); }, 1500);
    } catch (e) { resolve('threw: ' + e); }
  }));
  expect(started).toBe('ok');
  // GoatCounter as analytics.js uses it (analytics is off on localhost): the main site's count.js, then one
  // request of each kind its beacon uses. The fixtures answer goatcounter.com locally and count.js is the
  // fixtures' no-op, so nothing is counted.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/assets/count.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('count.js did not load'));
    document.head.appendChild(s);
  }));
  await page.evaluate(() => {
    navigator.sendBeacon('https://sbmadhav.goatcounter.com/count?e2e=csp');
    new Image().src = 'https://sbmadhav.goatcounter.com/count?e2e=csp-img';
  });
  await page.waitForTimeout(1000);
  await expectNoViolations(page, v, 'the Explore menu, voice worker and analytics');
});

test('the probe catches a violation (negative control)', async ({ page, baseURL }) => {
  const v = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__inline = 1'; document.body.appendChild(s); });
  await expect.poll(async () => (await v.list()).map(x => x.directive).join(' ')).toMatch(/script-src/);
  expect(await page.evaluate(() => (window as any).__inline)).toBeUndefined();
});
