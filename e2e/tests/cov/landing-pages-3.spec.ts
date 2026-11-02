import { test, expect, APP } from '../fixtures';

/* landing-pages, Requirement "A Mode link opens the game in that Mode" (openspec change landing-modes-and-return):
   one test per scenario. Analytics is stubbed so the event can be checked and nothing counts. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path + ' ' + title); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const mode = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return ((p.list || []).find((x: any) => x.id === p.active) || {}).mode ?? null; });

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('a first visit', () => {
  test.use({ seedMode: null });

  test('Counted: /learn/?mode=pro sets Pro and sends one math/landing/mode/pro, naming no Player', async ({ page }) => {
    await page.goto(`${APP}?mode=pro`);
    await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
    expect(await mode(page)).toBe('pro');
    await expect.poll(async () => (await events(page)).filter(e => e.startsWith('math/landing/'))).toEqual(['math/landing/mode/pro Vedic Math: landing mode card']);
    const name = await page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0].name);
    expect((await events(page)).filter(e => e.includes(name))).toEqual([]);
    expect(new URL(page.url()).search).toBe('');
  });

  test('Unknown value: /learn/?mode=wizard shows the Mode picker, stores no Mode and leaves /learn/', async ({ page }) => {
    await page.goto(`${APP}?mode=wizard`);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    expect(await mode(page)).toBeNull();
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe('/learn/');
    expect((await events(page)).filter(e => e.startsWith('math/landing/'))).toEqual([]);
  });
});

test('Switching: a Challenger opening /learn/?mode=explorer gets the Explorer Home', async ({ page }) => {
  await page.goto(`${APP}?mode=explorer`);
  await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
  expect(await mode(page)).toBe('explorer');
});
