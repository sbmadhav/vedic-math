import { test, expect, APP, ANALYTICS } from '../fixtures';
import { BASE_URL } from '../../playwright.config';

/* analytics spec, Requirement "Events carry no identifiers", Scenario "Global Privacy Control":
   WHEN the browser sends Global Privacy Control THEN no analytics request is made.

   e2e/tests/analytics-gpc.spec.ts covers this only against a real host: the shared /assets/analytics.js is off on
   localhost, so that test skips on a local BASE_URL. Here the app is served under a made-up, non-local host name
   (every request to it is answered from BASE_URL), so the real, unmodified analytics.js runs with analytics on,
   and the control run (GPC off) proves the setup would see a GoatCounter request. The fixtures still answer
   GoatCounter locally, so nothing is ever counted. */
const HOST = 'http://vedic-e2e.example';

async function serveUnderFakeHost(context: import('@playwright/test').BrowserContext) {
  await context.route(/^http:\/\/vedic-e2e\.example\//, async route => {
    const url = BASE_URL + route.request().url().slice(HOST.length);
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
}

for (const gpc of [true, false]) {
  test(`Global Privacy Control ${gpc ? 'on: no analytics request is made, even for page changes and events' : 'off (control): GoatCounter loads on the same setup'}`, async ({ page, context }) => {
    test.setTimeout(60_000);
    await serveUnderFakeHost(context);
    const gc: string[] = [];
    context.on('request', r => { if (ANALYTICS.test(r.url())) gc.push(r.url()); });
    if (gpc) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { configurable: true, get: () => true }));

    await page.goto(HOST + APP);
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    await page.waitForLoadState('load');
    expect(await page.evaluate(() => (navigator as any).globalPrivacyControl === true)).toBe(gpc);
    expect(await page.evaluate(() => location.hostname)).toBe('vedic-e2e.example');
    await expect.poll(() => page.evaluate(() => typeof (window as any).siteTrack)).toBe('function');

    // Things that would be counted with analytics on: in-app page changes and named events
    await page.evaluate(() => { location.hash = '#/dojo'; });
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    await page.evaluate(() => history.pushState(null, '', location.pathname + '#/'));
    await page.evaluate(() => (window as any).siteTrack('math/e2e_probe', 'E2E probe'));

    if (gpc) {
      // analytics.js waits for load and then idle (at most 4 s) before it loads GoatCounter; wait past that
      await page.waitForTimeout(6500);
      expect(gc).toEqual([]);
    } else {
      await expect.poll(() => gc.length, { timeout: 15_000 }).toBeGreaterThan(0);
    }
  });
}
