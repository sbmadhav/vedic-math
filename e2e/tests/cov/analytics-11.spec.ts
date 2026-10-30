import { test, expect, APP, open } from '../fixtures';

/* analytics spec, Requirement "Try a trick and Find are counted" (as modified by try-trick-in-modes): one test per scenario. The shared analytics.js is
   replaced by a stub that records window.siteTrack calls, so nothing is counted. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<[string, string][]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('a new visitor', () => {
  test.use({ seedMode: null });
  test('Try a trick: from Pro Home it sends math/try/start and math/try/mode/pro once each, then the route view math/view/try, and nothing names the Player', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="pro"]').click(); await page.locator('[data-try-open]').click(); /* the picker's card, then Home's Try a trick card (openspec change play-nav-by-mode) */
    await expect(page.locator('#tyStart')).toBeVisible();
    const ev = await events(page), paths = ev.map(([p]) => p);
    expect(paths.filter(p => p.startsWith('math/try/'))).toEqual(['math/try/start', 'math/try/mode/pro']);
    const i = paths.indexOf('math/try/mode/pro');
    expect(paths.slice(i + 1).find(p => p.startsWith('math/view/'))).toBe('math/view/try');
    const name = await page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0].name as string);
    expect(ev.some(([p, t]) => (p + ' ' + t).includes(name))).toBe(false);
  });
});

test('A Find result: typing "squares" and following the first result sends exactly one math/find/go, with no path or title holding the text or the result', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('squares');
  await page.locator('#findOut .find-hit').first().click();
  await expect(page).toHaveURL(/#\/skill\/v-sq5$/);
  const ev = await events(page);
  expect(ev.filter(([p]) => p.startsWith('math/find/'))).toEqual([['math/find/go', 'Vedic Math: find result followed']]);
  expect(ev.some(([p, t]) => /squares/i.test(p + ' ' + t))).toBe(false);
  expect(ev.filter(([p]) => p.startsWith('math/find/')).some(([p, t]) => /square/i.test(p + ' ' + t))).toBe(false);
  expect(ev.some(([p]) => p.startsWith('math/view/find'))).toBe(true);
});

test('A browse link is not a Find result: following a browse link, with the box empty or after no match, sends no math/find/go', async ({ page }) => {
  await open(page, '#/find');
  await expect(page.locator('#findOut .find-hit').first()).toBeVisible();
  await expect(page.locator('#findOut .find-group')).toHaveCount(0);
  await page.locator('#findOut .find-hit').first().click();
  await expect(page).not.toHaveURL(/#\/find$/);
  expect((await events(page)).filter(([p]) => p.startsWith('math/find/'))).toEqual([]);
  await open(page, '#/find');
  await page.locator('#findIn').fill('zzqx');
  await expect(page.locator('#findCount')).toHaveText('Nothing matched');
  await page.locator('#findOut .find-hit').first().click();
  await expect(page).not.toHaveURL(/#\/find$/);
  expect((await events(page)).filter(([p]) => p.startsWith('math/find/'))).toEqual([]);
});
