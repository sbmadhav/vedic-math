import { test, expect, APP, open, appErrors, mod } from './fixtures';

/* The first load's critical path (docs/perf/baseline.md, "Off the critical path"): the Arena and Tower rounds
   (js/arena.js, js/mental.js), the tour (js/tour.js) and the play experiences' kit (js/play/kit.js) are not requested
   before the page has loaded; js/app.js loads them a second after it, so a round or the tour has them at once, and one
   asked for sooner loads then and still starts. */
type Page = import('@playwright/test').Page;
/* The mental families moved to shared/src/mental.ts (react-typescript task 3.1): the Arena reaches them at /js/ts/ */
const LATE = ['arena', 'ts/shared/src/mental', 'tour', 'play/kit'];
/* Each of them, by the path mod() gives wherever the build serves it, as it is requested: before or after the page's load */
const record = async (page: Page) => {
  const paths = new Map<string, string>();
  for (const name of LATE) paths.set(new URL(await mod(page, name), 'http://x').pathname, name);
  const seen: { name: string; afterLoad: boolean }[] = [];
  let loaded = false;
  page.on('load', () => { loaded = true; });
  page.on('request', r => { const name = paths.get(new URL(r.url()).pathname); if (name) seen.push({ name, afterLoad: loaded }); });
  return seen;
};

test.describe('a first visit', () => {
  test.use({ seedMode: null });

  test('the Mode picker draws without the round, tour and kit modules, which load after the page has', async ({ page }) => {
    const seen = await record(page);
    await page.goto(APP);
    await expect(page.locator('#view h1')).toHaveText('Fast, fun math for every brain');
    await expect.poll(() => [...new Set(seen.map(s => s.name))].sort(), { timeout: 10_000 }).toEqual([...LATE].sort());
    expect(seen.filter(s => !s.afterLoad)).toEqual([]);
  });
});

test('the Deep dive draws without them too', async ({ page }) => {
  const seen = await record(page);
  await open(page, '#/sutras/s1');
  await expect(page.locator('dialog.sutra-modal[open]')).toBeVisible();
  await page.waitForLoadState('load');
  expect(seen.filter(s => !s.afterLoad)).toEqual([]);
});

test('An Arena round started before js/arena.js is here starts once it arrives', async ({ page, issues }) => {
  let release!: () => void; const held = new Promise<void>(r => { release = r; });
  const arenaPath = new URL(await mod(page, 'arena'), 'http://x').pathname; /* wherever the build serves it */
  await page.route(url => url.pathname === arenaPath, async route => { await held; await route.continue(); });
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

test('An Arena left before js/arena.js arrives starts no round when it does', async ({ page, issues }) => {
  let release!: () => void; const held = new Promise<void>(r => { release = r; });
  const arenaPath = new URL(await mod(page, 'arena'), 'http://x').pathname;
  await page.route(url => url.pathname === arenaPath, async route => { await held; await route.continue(); });
  await open(page, '#/arena');
  await page.locator('#arGo').click();
  await expect(page.locator('.ar-count')).toBeVisible();
  await page.waitForTimeout(2600); /* past the countdown, the round waiting for its module */
  await page.evaluate(() => { location.hash = '#/learn'; });
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  release();
  /* The same module instance the app waits on: once it (and js/mental.js) has loaded, the app's waiting round has had its turn */
  await page.evaluate(async () => { await e2eMod('arena'); await new Promise(r => requestAnimationFrame(() => r(null))); });
  await expect(page.locator('#arQ')).toHaveCount(0);
  await expect(page.locator('html.play-open')).toHaveCount(0);
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  expect(appErrors(issues), 'console errors').toEqual([]);
});
