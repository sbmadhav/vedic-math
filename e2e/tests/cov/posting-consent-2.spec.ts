import { test, expect, open, heldClock, cloudLog, type Mode, typeAnswer, needsWorldBoards } from '../fixtures';
import type { Page, BrowserContext } from '@playwright/test';

/* openspec posting-consent, "Age answer is never sent": a Player gives an Age answer and later posts (13 or over) or
   never posts (under 13, change learnvedicmath), and nothing leaving the device carries that answer: no network
   request (URL, headers or body), no analytics event (window.siteTrack), and no write the app hands the Firebase SDK
   (the fixtures' fake records them; nothing reaches production). */

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

/** Answers the age question on the Me page. */
async function answerOnMe(page: Page, age: number) {
  await open(page, '#/me');
  await page.locator('#wbAsk').click();
  await expect(sheet(page)).toBeVisible();
  await sheet(page).locator(`[data-age="${age}"]`).click();
  if (age < 13) {
    await expect(sheet(page).locator('h2')).toHaveText('Saved on this device');
    await sheet(page).getByRole('button', { name: 'OK' }).click();
  }
  await expect(sheet(page)).toBeHidden();
  expect((await savedPlayer(page)).age).toBe(age);
}

/** Checks that nothing recorded so far carries the Age answer. */
async function expectAgeNeverSent(page: Page, sent: Sent[], age: number, posts = true) {
  const log = await cloudLog(page);
  if (posts) expect(log.writes.length).toBeGreaterThan(0);
  else expect(log.writes).toEqual([]);
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

  test('a 15 answer: the weekly Sparks post carries no Age answer', async ({ page, context }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    const AGE = 15;
    const sent = await recordOutgoing(context);
    await heldClock(page);
    await open(page, '#/me');
    // This week's Sparks (50), so the weekly Sparks Board post goes out once posting is allowed
    await page.evaluate(async () => {
      const store = await e2eMod('store');
      localStorage.setItem('mathquest.v1.p1', JSON.stringify({ v: 3, sparks: 50, weekSparks: { [store.isoWeek()]: 50 } }));
    });
    await page.reload();
    await expect(page.locator('#worldBoards')).toBeVisible();

    await answerOnMe(page, AGE);
    await page.clock.runFor(5_000); // the weekly Sparks post waits at least 3 seconds
    await expect.poll(async () => (await cloudLog(page)).writes.map(w => w.path.split('/')[1])).toEqual([expect.stringMatching(/^xp-week-/)]);
    const w = (await cloudLog(page)).writes[0];
    expect(w.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 50 });
    // The answer is still on the device
    expect((await savedPlayer(page)).age).toBe(AGE);
    await expectAgeNeverSent(page, sent, AGE);
  });

  test('an under-13 answer given at the first would-be post: nothing is posted, and nothing sent carries the answer', async ({ page, context, browserName }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    test.skip(browserName === 'webkit', "Arena rounds need the faked clock, which WebKit's requestAnimationFrame does not follow evenly");
    test.setTimeout(120_000);
    const AGE = 7, mode: Mode = 'pro';
    const sent = await recordOutgoing(context);
    await page.clock.install();

    async function arenaRound() {
      if (!page.url().endsWith('#/arena')) await open(page, '#/arena');
      // The last round's result is still in the play shell: Back to the Arena
      if (await page.locator('#arDone').isVisible()) await page.locator('#arDone').click();
      const answer = await page.evaluate(async m => {
        const cloud = await e2eMod('cloud'), arena = await e2eMod('arena');
        return String(arena.dailySet(m, cloud.dayId())[0].answer);
      }, mode);
      await page.locator('#arGo').click();
      await page.clock.runFor(2_500);
      await typeAnswer(page, answer);
      await page.locator('#arForm button').click();
      await expect(page.locator('#arScore')).toHaveText('10');
      await page.clock.fastForward(61_000);
      await expect(page.locator('.ar-result')).toBeVisible();
    }

    // First would-be post: the question is asked, answered under 13, nothing posted
    await arenaRound();
    await expect(sheet(page)).toBeVisible();
    await sheet(page).locator(`[data-age="${AGE}"]`).click();
    await expect(sheet(page).locator('h2')).toHaveText('Saved on this device');
    expect((await cloudLog(page)).writes).toEqual([]);
    await sheet(page).getByRole('button', { name: 'OK' }).click();

    // The next round posts nothing either: an under-13 Player uses the Device board only
    await arenaRound();
    await expect(sheet(page)).toBeHidden();
    await page.clock.runFor(70_000);
    expect((await savedPlayer(page)).age).toBe(AGE);
    await expectAgeNeverSent(page, sent, AGE, false);
  });
});
