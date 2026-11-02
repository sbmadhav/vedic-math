import { test, expect, APP, open } from '../fixtures';
import { DAY, NOW, link, clockAt, endRound, pressStart, dailyItems, answerRight, fakeShareSheet, shared } from '../challenge-kit';

/* analytics spec (change arena-challenge-link), Requirement "Challenge links are counted without identifiers": one test
   per scenario. This site's /js/analytics.js is replaced by a stub that records every window.siteTrack path and title,
   so nothing is counted; every request the page makes is recorded too. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title || '']); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<[string, string][]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('The button: each tap on Challenge a friend sends exactly one math/share_click/result, whether the sheet opened or the Player cancelled', async ({ page }) => {
  await fakeShareSheet(page);
  await clockAt(page, NOW);
  await open(page, '#/arena');
  const items = await dailyItems(page, 'challenger', DAY);
  await pressStart(page);
  await answerRight(page, items, 0, 1);
  await endRound(page);
  const shares = async () => (await events(page)).filter(([p]) => p.startsWith('math/share_click/'));
  expect(await shares()).toEqual([]);
  await page.locator('#arShare').click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  expect(await shares()).toEqual([['math/share_click/result', 'Vedic Math: share']]);
  // A cancelled share sheet counts the tap all the same
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); } }); });
  await page.locator('#arShare').click();
  await expect.poll(async () => (await shares()).length).toBe(2);
  expect(await shares()).toEqual([['math/share_click/result', 'Vedic Math: share'], ['math/share_click/result', 'Vedic Math: share']]);
  for (const [p, t] of await events(page)) expect(p + t, 'no Score or Nickname in any event').not.toMatch(/\b10\b|Swift|Tiger/);
});

test('Opening a link: the route view is math/view/arena/day, and no request or event carries the fragment, the date or the Score', async ({ page }) => {
  const requests: { url: string; body: string }[] = [];
  page.on('request', r => requests.push({ url: r.url(), body: r.postData() || '' }));
  await clockAt(page, new Date('2026-10-30T10:00:00'));
  await open(page, link('2026-10-30', 'challenger', '240'));
  await expect(page.locator('#arFriend')).toContainText('Score 240 to beat');
  await expect.poll(async () => (await events(page)).filter(([p]) => p.startsWith('math/view/'))).toEqual([['math/view/arena/day', 'Vedic Math: page view']]);
  await expect(page).toHaveTitle('Arena · Learn Vedic Math');
  for (const [p, t] of await events(page)) expect(p + t).not.toMatch(/2026-10-30|challenger\/240|240|#/);
  expect(requests.length).toBeGreaterThan(5);
  for (const { url, body } of requests) {
    expect(url, 'the fragment or the link\'s parts in a request URL').not.toMatch(/2026-10-30|challenger\/240|arena\/day|%23|#/);
    // Cache stamps (?v=<hash>) are content hashes, so the digits are compared without them
    expect(url.replace(/\?.*$/, ''), 'the Score in a request path').not.toMatch(/240/);
    expect(body, 'the fragment or the Score in a request body').not.toMatch(/2026-10-30|challenger\/240|arena\/day|\b240\b/);
  }
  // The page's own address keeps the fragment: the browser never sends it
  expect(new URL(page.url()).hash).toBe(link('2026-10-30', 'challenger', '240'));
  expect(page.url().startsWith(`${new URL(page.url()).origin}${APP}`)).toBe(true);
});
