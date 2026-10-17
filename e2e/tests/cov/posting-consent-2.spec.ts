import { test, expect, open, heldClock, cloudLog, type Mode, typeAnswer } from '../fixtures';
import type { Page, BrowserContext } from '@playwright/test';

/* openspec posting-consent, "Age answer is never sent": a Player gives an Age answer (under 13 here, so the
   Parent step is given too) and later posts, and nothing leaving the device carries that answer: no network
   request (URL, headers or body), no analytics event (window.siteTrack), and no write the app hands the
   Firebase SDK (the fixtures' fake records them; nothing reaches production).
   "Under-13 Player in Pro mode" is already asserted by e2e/tests/consent.spec.ts:119 (nothing posted, the Device
   board, the "a parent or guardian can turn on World boards" toast), so it is not repeated here. */

const sheet = (page: Page) => page.locator('dialog.vm-sheet');
const savedPlayer = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0]);
/* Anything that could carry the Age answer or the Parent step: a key named age, the 'adult' value, parentOk */
const AGE_MARK = /(^|[^a-z])age["'\s]*[:=]|adult|grown-?up|parentOk/i;

type Sent = { url: string; headers: string; body: string };
/** Records every request the browser context makes (pages and workers), and every window.siteTrack call. */
async function recordOutgoing(context: BrowserContext) {
  const sent: Sent[] = [];
  context.on('request', r => sent.push({ url: r.url(), headers: JSON.stringify(r.headers()), body: r.postData() || '' }));
  await context.addInitScript(() => {
    const w = window as any; w.__tracks = [];
    let fn: any;
    Object.defineProperty(w, 'siteTrack', {
      configurable: true,
      get: () => fn && ((...a: unknown[]) => { w.__tracks.push(a.map(String)); return fn(...a); }),
      set: v => { fn = v; },
    });
  });
  return sent;
}
const tracks = (page: Page) => page.evaluate(() => (window as any).__tracks as string[][]);

/** Answers the age question on the Me page, then gives the Parent step (adult check, then the switch). */
async function answerAndGiveParentStep(page: Page, age: number) {
  await open(page, '#/me');
  await page.locator('#wbAsk').click();
  await expect(sheet(page)).toBeVisible();
  await sheet(page).locator(`[data-age="${age}"]`).click();
  await expect(sheet(page).locator('h2')).toHaveText('Saved on this device');
  // The sheet's link for grown-ups leads to the Parent step on this page
  await sheet(page).getByRole('link', { name: 'For grown-ups: turn on World boards' }).click();
  await expect(sheet(page)).toBeHidden();
  expect((await savedPlayer(page)).age).toBe(age);
  const card = page.locator('#worldBoards');
  await card.locator('#wbIn').fill((await card.locator('#wbCheck').getAttribute('data-n'))!);
  await card.getByRole('button', { name: 'Check' }).click();
  await card.getByRole('switch').click();
  await expect(page.locator('#wbMsg')).toHaveText('World boards are on for this player.');
}

/** Checks that nothing recorded so far carries the Age answer. */
async function expectAgeNeverSent(page: Page, sent: Sent[], age: number) {
  const log = await cloudLog(page);
  expect(log.writes.length).toBeGreaterThan(0);
  for (const w of log.writes) {
    expect(Object.keys(w.data).sort()).toEqual(['avatar', 'exp', 'name', 'score', 'ts']);
    expect(JSON.stringify(w.data)).not.toMatch(AGE_MARK);
    expect(w.path).not.toMatch(AGE_MARK);
  }
  expect(sent.length).toBeGreaterThan(0);
  expect(sent.filter(s => AGE_MARK.test(s.url) || AGE_MARK.test(s.body) || AGE_MARK.test(s.headers))).toEqual([]);
  // The analytics events record that the question was answered, never the answer
  const t = await tracks(page);
  expect(t.filter(([p]) => /age/.test(p) && !/view\//.test(p))).toEqual([['math/age-answer', 'Vedic Math: age question answered']]);
  for (const [p, title] of t) {
    expect(`${p} ${title}`).not.toMatch(AGE_MARK);
    expect(`${p} ${title}`).not.toContain(`age ${age}`);
    expect(`${p} ${title}`).not.toContain(`age/${age}`);
  }
}

test.describe('Age answer is never sent', () => {
  test.use({ seedMode: 'pro' });

  test('an under-13 answer with the Parent step: the weekly Sparks post carries no Age answer', async ({ page, context }) => {
    const AGE = 9;
    const sent = await recordOutgoing(context);
    await heldClock(page);
    await open(page, '#/me');
    // This week's Sparks (50), so the weekly Sparks Board post goes out once posting is allowed
    await page.evaluate(async () => {
      const store = await import('/vedic-math/js/store.js' as string);
      localStorage.setItem('mathquest.v1.p1', JSON.stringify({ v: 3, sparks: 50, weekSparks: { [store.isoWeek()]: 50 } }));
    });
    await page.reload();
    await expect(page.locator('#worldBoards')).toBeVisible();

    await answerAndGiveParentStep(page, AGE);
    await page.clock.runFor(5_000); // the weekly Sparks post waits at least 3 seconds
    await expect.poll(async () => (await cloudLog(page)).writes.map(w => w.path.split('/')[1])).toEqual([expect.stringMatching(/^xp-week-/)]);
    const w = (await cloudLog(page)).writes[0];
    expect(w.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 50 });
    // The answer is still on the device
    expect((await savedPlayer(page)).age).toBe(AGE);
    await expectAgeNeverSent(page, sent, AGE);
  });

  test('an under-13 answer given at the first would-be post: later Arena Scores carry no Age answer', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', "Arena rounds need the faked clock, which WebKit's requestAnimationFrame does not follow evenly");
    test.setTimeout(120_000);
    const AGE = 7, mode: Mode = 'pro';
    const sent = await recordOutgoing(context);
    await page.clock.install();

    async function arenaRound() {
      await open(page, '#/arena');
      const answer = await page.evaluate(async m => {
        const cloud = await import('/vedic-math/js/cloud.js' as string), arena = await import('/vedic-math/js/arena.js' as string);
        return String(arena.dailySet(m, cloud.dayId())[0].answer);
      }, mode);
      await page.locator('#arGo').click();
      await page.clock.runFor(2_500);
      await typeAnswer(page, answer);
      await page.locator('#arForm button').click();
      await expect(page.locator('#arScore')).toHaveText('10');
      await page.clock.runFor(61_000);
      await expect(page.locator('.ar-result')).toBeVisible();
    }

    // First would-be post: the question is asked, answered under 13, nothing posted
    await arenaRound();
    await expect(sheet(page)).toBeVisible();
    await sheet(page).locator(`[data-age="${AGE}"]`).click();
    await expect(sheet(page).locator('h2')).toHaveText('Saved on this device');
    expect((await cloudLog(page)).writes).toEqual([]);
    await sheet(page).getByRole('button', { name: 'OK' }).click();

    // The Parent step, then the next round posts its Score
    const card = page.locator('#worldBoards');
    await open(page, '#/me');
    await card.locator('#wbIn').fill((await card.locator('#wbCheck').getAttribute('data-n'))!);
    await card.getByRole('button', { name: 'Check' }).click();
    await card.getByRole('switch').click();
    await expect(page.locator('#wbMsg')).toHaveText('World boards are on for this player.');
    await arenaRound();
    await expect.poll(async () => (await cloudLog(page)).writes.filter(w => /^boards\/(daily|week)-/.test(w.path)).length).toBe(2);
    await expect(page.locator('.fx-toast').last()).toContainText('Posted to the world leaderboard');
    expect((await savedPlayer(page)).age).toBe(AGE);
    await expectAgeNeverSent(page, sent, AGE);
  });
});
