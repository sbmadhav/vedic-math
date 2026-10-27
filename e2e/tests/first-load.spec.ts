import { test, expect, APP, open, appErrors } from './fixtures';

/* The first load's critical path (docs/perf/baseline.md, "Off the critical path"): the Arena and Tower rounds
   (js/arena.js, js/mental.js), the tour (js/tour.js) and the play experiences' kit (js/play/kit.js) are not requested
   before the page has loaded; js/app.js loads them a second after it, so a round or the tour has them at once, and one
   asked for sooner loads then and still starts. */
type Page = import('@playwright/test').Page;
const LATE = /\/js\/(arena|mental|tour|play\/kit)\.js(\?.*)?$/;
const record = (page: Page) => {
  const seen: { url: string; afterLoad: boolean }[] = [];
  let loaded = false;
  page.on('load', () => { loaded = true; });
  page.on('request', r => { if (LATE.test(new URL(r.url()).pathname + new URL(r.url()).search)) seen.push({ url: new URL(r.url()).pathname, afterLoad: loaded }); });
  return seen;
};

test.describe('a first visit', () => {
  test.use({ seedMode: null });

  test('the Mode picker draws without the round, tour and kit modules, which load after the page has', async ({ page }) => {
    const seen = record(page);
    await page.goto(APP);
    await expect(page.locator('#view h1')).toHaveText('Fast, fun math for every brain');
    await expect.poll(() => [...new Set(seen.map(s => s.url))].sort(), { timeout: 10_000 }).toEqual(['/js/arena.js', '/js/mental.js', '/js/play/kit.js', '/js/tour.js']);
    expect(seen.filter(s => !s.afterLoad)).toEqual([]);
  });
});

test('the Deep dive draws without them too', async ({ page }) => {
  const seen = record(page);
  await open(page, '#/sutras/s1');
  await expect(page.locator('dialog.sutra-modal[open]')).toBeVisible();
  await page.waitForLoadState('load');
  expect(seen.filter(s => !s.afterLoad)).toEqual([]);
});

test('An Arena round started before js/arena.js is here starts once it arrives', async ({ page, issues }) => {
  let release!: () => void; const held = new Promise<void>(r => { release = r; });
  await page.route(/\/js\/arena\.js(\?.*)?$/, async route => { await held; await route.continue(); });
  await open(page, '#/arena');
  await page.locator('#arGo').click();
  await expect(page.locator('.ar-count')).toBeVisible();
  await page.waitForTimeout(2600); /* past the countdown */
  await expect(page.locator('#arQ')).toHaveCount(0);
  release();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await page.goto(`${APP}#/learn`); /* leave before the round ends: nothing is posted */
  expect(appErrors(issues), 'console errors').toEqual([]);
});
