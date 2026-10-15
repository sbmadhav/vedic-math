import { test, expect, APP, open, ANALYTICS, chromiumOnly } from './fixtures';

/* Anonymous usage events (openspec analytics spec). The shared /assets/analytics.js is replaced by a stub
   that only records window.siteTrack calls in window.__events, so no GoatCounter request is ever made and
   test runs never count as visits. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('each rendered route sends one route view, numbers collapsed; no GoatCounter request', async ({ page, context }) => {
  const gc: string[] = [];
  context.on('request', r => { if (ANALYTICS.test(r.url())) gc.push(r.url()); });
  await open(page);
  await expect.poll(() => events(page)).toContain('math/view/home');
  await page.goto(`${APP}#/arena`);
  await expect(page.locator('#arGo')).toBeVisible();
  await page.goto(`${APP}#/game/times-sprint/1`);
  await expect(page.locator('#gStart')).toBeVisible();
  const ev = (await events(page)).filter(e => e.startsWith('math/view/'));
  expect(ev).toEqual(['math/view/home', 'math/view/arena', 'math/view/game/times-sprint/level']);
  expect(gc).toEqual([]);
});

test.describe('first visit', () => {
  test.use({ seedMode: null });
  test('the Mode picker is counted as pick-mode', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('.mode-pick .mode-card').first()).toBeVisible();
    await expect.poll(() => events(page)).toEqual(['math/view/pick-mode']);
  });
});

/** Answers the multiplication question on a Practice page right */
async function answerRight(page: Page) {
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.locator('#practice .ans-in').fill(String(a * b));
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
}

test('Practice answers send q_answered each, and first_win once per device', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await open(page, '#/skill/3-mult');
  await answerRight(page);
  await page.locator('#practice #prCheck').click(); // Next
  await page.locator('#practice #prShow').click();  // Show me: a miss
  let ev = await events(page);
  expect(ev.filter(e => e.startsWith('math/q_answered/'))).toEqual(['math/q_answered/practice/right', 'math/q_answered/practice/miss']);
  expect(ev.filter(e => e.startsWith('math/first_win/'))).toEqual(['math/first_win/under-30']);
  await page.reload();
  await expect(page.locator('#practice #prQ')).toBeVisible();
  await answerRight(page);
  ev = await events(page);
  expect(ev.filter(e => e.startsWith('math/q_answered/'))).toEqual(['math/q_answered/practice/right']);
  expect(ev.filter(e => e.startsWith('math/first_win/'))).toEqual([]);
  // The device flags stay in this browser and hold no ids
  const flags = await page.evaluate(() => [localStorage.getItem('vm.metrics'), localStorage.getItem('vm.firstSeen')]);
  expect(JSON.parse(flags[0]!)).toEqual({ firstWin: true });
  expect(flags[1]).toMatch(/^\d+$/);
});

test('two Arena Practice rounds: round_end r1 and r2 and one round2_start, no per-answer events', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  test.slow(); // two 60 second rounds on the fake clock
  await page.clock.install();
  await open(page, '#/arena');
  const round = async () => {
    await page.locator('[data-t="practice"]').click();
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500);
    await expect(page.locator('#arType')).toBeVisible();
    for (let i = 0; i < 3; i++) { await page.locator('#arType').fill('1'); await page.locator('#arForm button').click(); }
    await page.clock.runFor(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();
  };
  await round();
  await round();
  const ev = (await events(page)).filter(e => !e.startsWith('math/view/') && !e.startsWith('math/arena/'));
  expect(ev).toEqual(['math/round_end/arena/challenger/r1', 'math/round2_start/arena', 'math/round_end/arena/challenger/r2']);
});

test('a stopped game round sends no round_end', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await open(page, '#/game/times-sprint');
  await page.locator('#gStart').click();
  await expect(page.locator('#gQuit')).toBeVisible();
  await page.locator('#gQuit').click();
  await expect(page.locator('#gStart')).toBeVisible();
  const ev = await events(page);
  expect(ev).toContain('math/game/times-sprint/ranked'); // the round did start
  expect(ev.filter(e => e.includes('round_end') || e.includes('q_answered'))).toEqual([]);
});
