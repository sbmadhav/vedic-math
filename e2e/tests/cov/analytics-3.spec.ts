import { test, expect, open, heldClock, cloudLog, typeAnswer } from '../fixtures';

/* openspec analytics spec, "Answer events in untimed play" / Scenario: Arena answers.
   WHEN a Player answers 30 questions in an Arena round
   THEN no per-answer event is sent, and one round_end event is sent when the round ends.
   This site's /js/analytics.js is replaced by a stub that only records window.siteTrack calls. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('30 answers in an Arena round send no q_answered, and exactly one round_end when the round ends', async ({ page }) => {
  test.slow(); // 30 answers and a 60 second round on the held clock
  await heldClock(page);
  await open(page, '#/arena');
  await page.locator('[data-t="practice"]').click(); // Practice round: nothing is posted to any Board
  await page.locator('#arGo').click();
  await page.clock.runFor(2_500); // the 3, 2, 1 countdown
  await expect(page.locator('#arType')).toBeVisible();
  for (let i = 1; i <= 30; i++) {
    await typeAnswer(page, '1');
    await page.locator('#arForm button').click();
    await expect(page.locator('#arSay')).not.toHaveText(''); // the answer was taken
  }
  // Still in the round (the clock is held): nothing per answer, and no round_end yet
  await expect(page.locator('#arType')).toBeVisible();
  let ev = await events(page);
  expect(ev.filter(e => e.includes('q_answered'))).toEqual([]);
  expect(ev.filter(e => e.includes('round_end'))).toEqual([]);

  await page.clock.fastForward(61_000);
  await expect(page.locator('.ar-result')).toBeVisible();
  const counts = (await page.locator('.ar-result p').first().textContent()) || '';
  const [right, missed] = counts.match(/(\d+) right · (\d+) missed/)!.slice(1).map(Number);
  expect(right + missed).toBe(30);

  ev = await events(page);
  expect(ev.filter(e => e.includes('q_answered'))).toEqual([]);
  expect(ev.filter(e => e.includes('round_end'))).toEqual(['math/round_end/arena/challenger/r1']);
  expect((await cloudLog(page)).writes).toEqual([]);
});
