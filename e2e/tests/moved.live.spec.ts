import { test, expect } from '@playwright/test';
import { gunzipSync } from 'node:zlib';

/* The published moved page at https://sbmadhav.com/vedic-math/ during Phase B (task 16.1; e2e.yml job moved-page, run
   when the repository variable MOVE_PHASE is B). The fuller cases run against a local build in moved.spec.ts. Nothing is
   counted: the GoatCounter request and learnvedicmath.com are answered locally, so only the address is checked. */
const MOVED = process.env.MOVED_URL || '';
test.skip(!MOVED, 'MOVED_URL is not set');

test.beforeEach(async ({ context }) => {
  await context.route('https://learnvedicmath.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>new site</title>' }));
  await context.route(/goatcounter\.com\//, r => r.fulfill({ status: 204 }));
  await context.route(/\/vedic-math\/__seed$/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }));
});

test('the live moved page sends an empty device to the game on the same route', async ({ page }) => {
  await page.goto(MOVED + '#/arena');
  await page.waitForURL(/learnvedicmath\.com\/play\/(#\/)?arena$/);
});

test('the live moved page carries saved progress to /import/ in the fragment', async ({ page }) => {
  await page.goto(MOVED + '__seed');
  await page.evaluate(() => {
    localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: 'Brave Otter 17', avatar: 'plum', mode: 'explorer', created: 1 }] }));
    localStorage.setItem('mathquest.v1.p1', JSON.stringify({ v: 3, sparks: 77, skills: {} }));
  });
  await page.goto(MOVED);
  await page.waitForURL(/^https:\/\/learnvedicmath\.com\/import\/#v=1&d=/);
  const d = new URLSearchParams(new URL(page.url()).hash.slice(1)).get('d') || '';
  const data = JSON.parse(gunzipSync(Buffer.from(d, 'base64url')).toString());
  expect(data.records.p1.sparks).toBe(77);
  // The KILL worker is what is published at the old worker's URL
  const sw = await (await page.request.get(MOVED + 'sw.js')).text();
  expect(sw).toMatch(/^const KILL = true;$/m);
});
