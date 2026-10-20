import { test, expect, APP, ANALYTICS, chromiumOnly } from './fixtures';
import { BASE_URL } from '../playwright.config';

/* Global Privacy Control turns analytics off (analytics spec). This loads the real /js/analytics.js.
   The fixtures answer GoatCounter locally, so even the control run counts no visit. analytics.js is off on
   localhost anyway, so this only means something against a real host (the live site). */
test.skip(/localhost|127\.0\.0\.1/.test(BASE_URL), 'analytics.js is off on localhost');

for (const gpc of [true, false]) {
  test(`with Global Privacy Control ${gpc ? 'on, no analytics request is made' : 'off, GoatCounter loads (control)'}`, async ({ page, context }, testInfo) => {
    chromiumOnly(testInfo, 'the opt-out is in the shared script, the same in every engine');
    const gc: string[] = [];
    context.on('request', r => { if (ANALYTICS.test(r.url())) gc.push(r.url()); });
    if (gpc) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
    await page.goto(APP);
    await page.waitForLoadState('load');
    await page.evaluate(() => new Promise(r => setTimeout(r, 6000))); // analytics.js waits for load and idle (at most 4 s)
    if (gpc) expect(gc).toEqual([]);
    else expect(gc.length).toBeGreaterThan(0);
  });
}
