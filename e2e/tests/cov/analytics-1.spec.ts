import { test, expect, APP, open } from '../fixtures';

/* openspec/specs/analytics/spec.md, Requirement: Route views are counted.
   The shared /assets/analytics.js is replaced by a stub that records window.siteTrack calls, so nothing is sent. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const views = async (page: Page): Promise<string[]> =>
  ((await page.evaluate(() => (globalThis as any).__events || [])) as string[]).filter(e => e.startsWith('math/view/'));

test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('Opening the Arena: navigating to #/arena sends one math/view/arena event', async ({ page }) => {
  await open(page);
  await expect.poll(() => views(page)).toEqual(['math/view/home']);
  await page.evaluate(() => { location.hash = '#/arena'; });
  await expect(page.locator('#arGo')).toBeVisible();
  await expect.poll(() => views(page)).toEqual(['math/view/home', 'math/view/arena']);
  // Still exactly one after the view settles
  await page.waitForTimeout(500);
  expect((await views(page)).filter(e => e === 'math/view/arena')).toHaveLength(1);
});

test('Opening the Arena directly by URL sends exactly one math/view/arena event', async ({ page }) => {
  await page.goto(`${APP}#/arena`);
  await expect(page.locator('#arGo')).toBeVisible();
  await expect.poll(() => views(page)).toEqual(['math/view/arena']);
  await page.waitForTimeout(500);
  expect(await views(page)).toEqual(['math/view/arena']);
});

test('Game level: #/game/times-sprint/12 sends math/view/game/times-sprint/level, without the level number', async ({ page }) => {
  await open(page, '#/game/times-sprint/12');
  await expect(page.locator('#gStart')).toContainText('12'); // the level 12 page rendered
  await expect.poll(() => views(page)).toEqual(['math/view/game/times-sprint/level']);
  const all: string[] = await page.evaluate(() => (globalThis as any).__events || []);
  expect(all.filter(e => e.startsWith('math/view/') && /\d/.test(e))).toEqual([]);
});
