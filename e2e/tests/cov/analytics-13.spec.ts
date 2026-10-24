import { test, expect, APP } from '../fixtures';

/* analytics spec, Requirement "Answer events in untimed play", Scenario "Try a trick answer" (openspec change
   try-trick-in-modes). The shared analytics.js is replaced by a stub that records window.siteTrack paths, so nothing
   is counted; the device is new (seedMode null), so its first right answer is its first win. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test.use({ seedMode: null });
test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('Try a trick answer: the first question answered right sends one math/q_answered/try/right, then the first math/first_win', async ({ page }) => {
  await page.goto(APP);
  await page.locator('[data-try="challenger"]').click();
  await page.locator('#tyStart').click();
  await page.locator('#tyIn').fill('625');
  await page.keyboard.press('Enter');
  await expect(page.locator('#tySay')).toContainText('Right!');
  await expect.poll(async () => (await events(page)).filter(e => e.startsWith('math/q_answered/'))).toEqual(['math/q_answered/try/right']);
  const ev = await events(page);
  const win = ev.findIndex(e => e.startsWith('math/first_win/'));
  expect(win).toBeGreaterThan(ev.indexOf('math/q_answered/try/right'));
  expect(ev.filter(e => e.startsWith('math/first_win/'))).toHaveLength(1);
});
