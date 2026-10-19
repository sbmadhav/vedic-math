import { test, expect, APP, open, cloudLog, appErrors, type Page, typeAnswer } from '../fixtures';

/* arena spec:
   - Arena Practice rounds adapt / Practice is not posted: an Arena Practice round that ends, played by a Player
     whose scores may go to World boards (adult Age answer), sends nothing to any World Score board. A Daily round
     played the same way does post, so the check would catch a Practice post.
   - Explorer and Challenger daily rounds are unchanged / Challenger daily: the Challenger daily round deals
     makeSet('challenger', 'daily-<day>-challenger'), every item from the Challenger skill pool, with no Pro
     difficulty step. Nothing here is sent to a live backend: the fixtures' fake SDK records writes. */

const DAY = '2026-10-21'; // after the Pro switch to mental arithmetic (MENTAL_FROM 2026-10-19)
const NOW = new Date(`${DAY}T10:00:00`);
/* The Challenger pool before the Pro mental arithmetic change (js/arena.js POOLS.challenger) */
const CHALLENGER_POOL = ['3-mult', '3-div', 'v-sq5', 'v-by11', 'v-times5', 'v-ends10', '2-add100', '3-multtens', 'v-from9', 'v-by9s'];

/* A fake clock held at a fixed local date, moved only by the test */
async function clockAt(page: Page, when: Date) {
  await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
  await page.clock.install({ time: when });
  await page.clock.pauseAt(new Date(when.getTime() + 1000));
}
async function endRound(page: Page) {
  await page.clock.fastForward(61_000);
  await page.clock.runFor(100);
}
/* Works out the answer to a Pro Arena question from its text (as arena.spec.ts does) */
function mentalAnswer(text: string) {
  let m;
  if ((m = /^(\d+) × (\d+) = \?$/.exec(text))) return +m[1] * +m[2];
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(text))) return +m[1] / +m[2];
  if ((m = /^What is (\d+(?:\.5)?)% of (\d+)\?$/.exec(text))) return Math.round(+m[1] * 10 * +m[2]) / 1000;
  if ((m = /^(\d+)2 = \?$/.exec(text))) return +m[1] * +m[1];
  throw new Error('not a Pro Arena question: ' + text);
}
async function startRound(page: Page, type: 'daily' | 'practice') {
  await page.locator(`[data-t="${type}"]`).click();
  await expect(page.locator(`[data-t="${type}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#arGo').click();
  await page.clock.runFor(2200); // the 3, 2, 1 countdown
  await expect(page.locator('#arQ')).not.toBeEmpty();
}
async function answerRight(page: Page, n: number) {
  const q = page.locator('#arQ');
  for (let k = 0; k < n; k++) {
    const text = (await q.textContent()) || '';
    await typeAnswer(page, String(mentalAnswer(text)));
    await page.locator('#arForm button').click();
    await expect(page.locator('#arScore')).toHaveText(String(scoreAfter(k + 1)));
  }
}
/* The Score after n right answers in a row: 10 each plus a combo bonus of 2 per answer in a row (up to 20) */
const scoreAfter = (n: number) => { let s = 0; for (let c = 1; c <= n; c++) s += 10 + Math.min(c - 1, 10) * 2; return s; };
const scoreBoardWrites = (writes: { path: string }[]) => writes.filter(w => !/^boards\/xp-week-/.test(w.path));

test.describe('Practice is not posted', () => {
  test.use({ seedMode: 'pro', seedConsent: { age: 'adult' } });

  test('an Arena Practice round that ends sends nothing to any World Score board, even for a Player who may post', async ({ page, issues }) => {
    await clockAt(page, NOW);
    await open(page, '#/arena');
    await startRound(page, 'practice');
    await answerRight(page, 5); // 10 + 12 + 14 + 16 + 18 = 70, well over the 10 a board accepts
    await expect(page.locator('#arScore')).toHaveText('70');
    await endRound(page);
    await expect(page.locator('.ar-result')).toContainText('5 right · 0 missed');
    await expect(page.locator('.ar-result')).toContainText('Practice rounds do not count for the leaderboard.');
    await page.clock.runFor(2000);
    expect(scoreBoardWrites((await cloudLog(page)).writes), 'Practice Score sent to a World board').toEqual([]);
    await expect(page.locator('.fx-toasts')).not.toContainText('Posted to the world leaderboard');
    // Not even this device's boards hold a Practice Score
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'))).toEqual([]);
    // Later timers (the weekly Sparks total, which Practice Sparks add to by design) never carry the Score
    await page.clock.runFor(70_000);
    const writes = (await cloudLog(page)).writes;
    expect(scoreBoardWrites(writes)).toEqual([]);
    for (const w of writes) expect(w.data.score, 'only the weekly Sparks total, never the round Score').not.toBe(70);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  test('control: the same Player finishing a Daily round does post to today\'s and this week\'s boards', async ({ page }) => {
    await clockAt(page, NOW);
    await open(page, '#/arena');
    await startRound(page, 'daily');
    await answerRight(page, 5);
    await expect(page.locator('#arScore')).toHaveText('70');
    await endRound(page);
    await expect(page.locator('.ar-result')).toContainText('5 right · 0 missed');
    await expect.poll(async () => scoreBoardWrites((await cloudLog(page)).writes).map(w => w.path.split('/')[1]).sort())
      .toEqual([`daily-${DAY}-pro`, "week-2026-W43-pro"]);
  });
});

test.describe('Challenger daily', () => {
  test.use({ seedMode: 'challenger' });

  test('the Challenger daily round deals the Challenger pool questions of the daily seed, in order', async ({ page, issues }) => {
    await clockAt(page, NOW);
    await open(page, '#/arena');
    await expect(page.locator('.g-best')).toContainText('League: Challenger');
    // The expected set, built from the pre-change daily seed and checked against the Challenger pool
    const items = await page.evaluate(async day => {
      const A = await import('/js/arena.js' as string);
      const html = (h: string) => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; };
      const daily = A.dailySet('challenger', day), old = A.makeSet('challenger', `daily-${day}-challenger`);
      return { same: JSON.stringify(daily) === JSON.stringify(old), list: daily.map((q: any) => ({ q: html(q.q), answer: q.answer, skill: q.skill, d: q.d ?? null })) };
    }, DAY);
    expect(items.same, 'daily set uses the same seed as before the change').toBe(true);
    expect(items.list.length).toBe(80);
    for (const it of items.list) {
      expect(CHALLENGER_POOL, `skill ${it.skill}`).toContain(it.skill);
      expect(it.d, 'no Pro difficulty step').toBeNull();
    }
    await startRound(page, 'daily');
    const q = page.locator('#arQ');
    for (let i = 0; i < 8; i++) {
      expect(await q.innerHTML(), `question ${i + 1}`).toBe(items.list[i].q);
      await expect(q).not.toHaveAttribute('data-d', /.*/);
      await typeAnswer(page, String(items.list[i].answer));
      await page.locator('#arForm button').click();
      await expect(page.locator('#arScore')).toHaveText(String(scoreAfter(i + 1)));
    }
    await page.goto(`${APP}#/learn`); // leave before the round ends: nothing is posted
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
