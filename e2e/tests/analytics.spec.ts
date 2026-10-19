import { test, expect, APP, open, ANALYTICS, chromiumOnly, typeAnswer } from './fixtures';

/* Anonymous usage events (openspec analytics spec). This site's /js/analytics.js is replaced by a stub
   that only records window.siteTrack calls in window.__events, so no GoatCounter request is ever made and
   test runs never count as visits. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
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

test('a Star miss then a right rematch sends q_answered/star/miss then right, and the route is star/<trick>/star', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await open(page, '#/star/sq5/2');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  await page.keyboard.type('1'); await page.keyboard.press('Enter');
  await expect(page.locator('.star-step').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Rematch');
  const n = Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>/)![1]);
  await page.keyboard.type(String(n * n)); await page.keyboard.press('Enter');
  await expect(page.locator('#stSay')).toContainText('Comeback');
  const ev = await events(page);
  expect(ev.filter(e => e.startsWith('math/q_answered/'))).toEqual(['math/q_answered/star/miss', 'math/q_answered/star/right']);
  expect(ev).toContain('math/view/star/sq5/star');
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
    for (let i = 0; i < 3; i++) { await typeAnswer(page, '1'); await page.locator('#arForm button').click(); }
    await page.clock.runFor(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();
    await page.locator('#arDone').click(); // leave the result in the play shell
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

/* Star Quest counts and Sky views (sky-home 4.1) */
test.describe('with the Sky on', () => {
  test.use({ seedMode: 'pro', seedPlayer: { sky: true } });
  test('#/ sends math/view/sky, never home; All places is places', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-star')).toHaveCount(63);
    await expect.poll(() => events(page)).toContain('math/view/sky');
    await page.locator('#skyPlaces').click();
    await expect(page.locator('a.places-star')).toHaveCount(63);
    const ev = (await events(page)).filter(e => e.startsWith('math/view/'));
    expect(ev).toEqual(['math/view/sky', 'math/view/places']);
  });
  test('a round with a miss, a Comeback, a Dare taken and lost, and a lit Star sends comeback, dare_taken and lit once each, no dare_won', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    const sq = async () => { const n = Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>/)![1]); return String(n * n); };
    const tag = page.locator('#stMain .star-tag');
    await open(page, '#/star/sq5/1');
    await expect(tag).toHaveText('Question 1 of 4');
    await page.keyboard.type('1'); await page.keyboard.press('Enter'); // a miss
    await expect(page.locator('.star-step').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tag).toHaveText('Rematch');
    await page.keyboard.type(await sq()); await page.keyboard.press('Enter'); // a Comeback: 15
    await expect(page.locator('#stSay')).toContainText('Comeback');
    await expect(tag).toHaveText('Question 2 of 4');
    await page.locator('#stDare').click();
    await expect(tag).toHaveText('Dare');
    await page.keyboard.type('1'); await page.keyboard.press('Enter'); // the Dare lost: 0
    await expect(page.locator('.star-step').first()).toBeVisible();
    await page.keyboard.press('Escape');
    for (const q of [2, 3, 4]) {
      await expect(tag).toHaveText(`Question ${q} of 4`);
      await page.keyboard.type(await sq()); await page.keyboard.press('Enter'); // 10 each: 45 in all
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    }
    await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
    const star = (await events(page)).filter(e => e.startsWith('math/star/'));
    expect(star.sort()).toEqual(['math/star/comeback/sq5', 'math/star/dare_taken/sq5', 'math/star/lit/sq5']);
  });
  test('skipping a Star sends star/skipped once', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    await open(page, '#/star/by11/2');
    await page.locator('#stSkip').click();
    await expect(page.locator('.star-end-h')).toHaveText('Star 2 skipped');
    expect((await events(page)).filter(e => e.startsWith('math/star/'))).toEqual(['math/star/skipped/by11']);
  });
});

test('an untimed Arena Practice round sends its type and one round_end r1', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'app logic, the same in every engine');
  await open(page, '#/arena');
  await page.locator('[data-t="untimed"]').click();
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('#arForm button').click();
  await page.locator('#arFinish').click();
  await expect(page.locator('.ar-result')).toBeVisible();
  const ev = await events(page);
  expect(ev).toContain('math/arena/challenger/untimed');
  expect(ev.filter(e => e.includes('round_end'))).toEqual(['math/round_end/arena/challenger/r1']);
});
