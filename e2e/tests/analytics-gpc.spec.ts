import { test, expect, APP, ANALYTICS, chromiumOnly } from './fixtures';
import { BASE_URL } from '../playwright.config';

/* Global Privacy Control turns analytics off (analytics spec). This loads the real /js/analytics.js.
   The fixtures answer GoatCounter locally, so even the control run counts no visit. analytics.js is off on
   localhost anyway, so this only means something against a real host (the live site). */
test.skip(/localhost|127\.0\.0\.1/.test(BASE_URL), 'analytics.js is off on localhost');

for (const gpc of [true, false]) {
  test(`with Global Privacy Control ${gpc ? 'on, no analytics request is made' : 'off, GoatCounter and our Cloudflare beacon load (control)'}`, async ({ page, context }, testInfo) => {
    chromiumOnly(testInfo, 'the opt-out is in the shared script, the same in every engine');
    const gc: string[] = [];
    context.on('request', r => { if (ANALYTICS.test(r.url())) gc.push(r.url()); });
    if (gpc) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
    await page.goto(APP);
    await page.waitForLoadState('load');
    await page.evaluate(() => new Promise(r => setTimeout(r, 6000))); // analytics.js waits for load and idle (at most 4 s)
    if (gpc) expect(gc).toEqual([]);
    else {
      expect(gc.some(u => /goatcounter|\/vendor\/goatcounter\//.test(u)), 'GoatCounter loads').toBe(true);
      // Cloudflare Web Analytics: our own beacon tag (manual setup, not injected), with the learnvedicmath.com site token
      expect(gc.some(u => u.startsWith('https://static.cloudflareinsights.com/beacon.min.js')), 'the Cloudflare beacon loads').toBe(true);
      const beacons = await page.locator('script[src^="https://static.cloudflareinsights.com/beacon.min.js"]').evaluateAll(els => els.map(e => (e as HTMLScriptElement).dataset.cfBeacon || ''));
      expect(beacons, 'exactly one beacon: ours, nothing injected by Cloudflare').toHaveLength(1);
      expect(JSON.parse(beacons[0]).token).toBe('1841b328071d489da44be107523bf818');
    }
  });
}
