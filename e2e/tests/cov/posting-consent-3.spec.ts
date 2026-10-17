import { test, expect, open, cloudLog, type Mode, typeAnswer } from '../fixtures';
import type { Page } from '@playwright/test';

/* posting-consent spec, Requirement "Parent step for Players under 13":
   - Scenario "Grown-up gives the Parent step": after a grown-up completes the Parent step for an under-13
     Player, that Player's later Scores AND weekly Sparks totals post to World boards as for any other Player.
   - Scenario "Players 13 and over": a Player whose Age answer is 13 or over finishes a Ranked round, and the
     Score posts to World boards without the Parent step.
   Every write goes to the fake Firebase SDK in fixtures.ts, never to production Firestore. */

const ROUNDS_OFF_WEBKIT = "Arena rounds need the faked clock, which WebKit's requestAnimationFrame does not follow evenly";
const sheet = (page: Page) => page.locator('dialog.vm-sheet');
const savedPlayer = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0]);
const scoreWrites = async (page: Page) => (await cloudLog(page)).writes.filter(w => /^boards\/(daily|week)-/.test(w.path));
const sparksWrites = async (page: Page) => (await cloudLog(page)).writes.filter(w => /^boards\/xp-week-/.test(w.path));

/* This week's id as js/store.js isoWeek computes it, so a seeded weekly Sparks total lands in the current week */
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t.getTime() - y0.getTime()) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

/** Plays today's Arena Daily challenge with one right answer (score 10) and lets the 60 seconds run out. */
async function arenaRound(page: Page, mode: Mode) {
  await open(page, '#/arena');
  const answer = await page.evaluate(async m => {
    const cloud = await import('/vedic-math/js/cloud.js' as string), arena = await import('/vedic-math/js/arena.js' as string);
    return String(arena.dailySet(m, cloud.dayId())[0].answer);
  }, mode);
  await page.locator('#arGo').click();
  await page.clock.runFor(2_500); // 3, 2, 1
  if (mode === 'explorer') await page.locator(`.ar-choice[data-v="${answer}"]`).click();
  else {
    await typeAnswer(page, answer);
    await page.locator('#arForm button').click();
  }
  await expect(page.locator('#arScore')).toHaveText('10');
  await page.clock.runFor(61_000);
  await expect(page.locator('.ar-result')).toBeVisible();
}

/** Gives the Parent step on the Me page: the grown-up check, then the switch on. */
async function giveParentStep(page: Page) {
  await open(page, '#/me');
  const card = page.locator('#worldBoards');
  const form = card.locator('#wbCheck');
  await card.getByLabel(/Type this number in digits/).fill((await form.getAttribute('data-n'))!);
  await card.getByRole('button', { name: 'Check' }).click();
  const sw = card.getByRole('switch');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  expect(typeof (await savedPlayer(page)).parentOk).toBe('number');
}

test.describe('Grown-up gives the Parent step', () => {
  // An under-13 Challenger with Sparks already earned this week (enough for the weekly Sparks board)
  test.use({ seedMode: 'challenger', seedConsent: { age: 10 }, seedProgress: { v: 3, sparks: 40, weekSparks: { [isoWeek()]: 40 } } });

  test('later Scores and the weekly Sparks total post to World boards', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(120_000);
    await page.clock.install();

    // Before the Parent step: a Ranked round posts nothing, Score or Sparks
    await arenaRound(page, 'challenger');
    await page.clock.runFor(70_000);
    expect((await cloudLog(page)).writes).toEqual([]);

    await giveParentStep(page);

    // The next Ranked round posts the Score to the World boards (today and this week)
    await arenaRound(page, 'challenger');
    await expect.poll(async () => (await scoreWrites(page)).map(w => w.path).sort()).toEqual(
      [expect.stringMatching(/^boards\/daily-\d{4}-\d{2}-\d{2}-challenger\/scores\/e2e-fake-uid$/), expect.stringMatching(/^boards\/week-\d{4}-W\d{2}-challenger\/scores\/e2e-fake-uid$/)]);
    await expect(page.locator('.fx-toast').last()).toContainText('Posted to the world leaderboard');
    for (const w of await scoreWrites(page)) expect(w.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: 10 });

    // And this week's Sparks total goes to the weekly Sparks board (sent at most once a minute)
    await page.clock.runFor(70_000);
    // (it may already have gone out once during the round; the latest post carries the whole week's total)
    await expect.poll(async () => (await sparksWrites(page)).length).toBeGreaterThanOrEqual(1);
    const sp = (await sparksWrites(page)).at(-1)!;
    expect(sp.path).toBe(`boards/xp-week-${isoWeek()}-challenger/scores/e2e-fake-uid`);
    const weekTotal = await page.evaluate(async () => (await import('/vedic-math/js/store.js' as string)).weekSparks());
    expect(weekTotal).toBeGreaterThan(40);
    expect(sp.data).toMatchObject({ name: 'Swift Tiger 42', avatar: 'teal', score: weekTotal });
  });
});

test.describe('Players 13 and over', () => {
  for (const { mode, age } of [{ mode: 'challenger' as Mode, age: 13 }, { mode: 'explorer' as Mode, age: 16 }, { mode: 'pro' as Mode, age: 17 }]) {
    test.describe(`${mode}, age ${age}`, () => {
      test.use({ seedMode: mode, seedConsent: { age } });
      test(`${mode}: age ${age} posts a Ranked round's Score without the Parent step`, async ({ page, browserName }) => {
        test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
        test.setTimeout(90_000);
        await page.clock.install();
        await arenaRound(page, mode);
        await expect.poll(async () => (await scoreWrites(page)).length).toBe(2);
        for (const w of await scoreWrites(page)) {
          expect(w.path).toMatch(new RegExp(`^boards/(daily-\\d{4}-\\d{2}-\\d{2}|week-\\d{4}-W\\d{2})-${mode}/scores/e2e-fake-uid$`));
          expect(w.data).toMatchObject({ score: 10 });
        }
        await expect(page.locator('.fx-toast').last()).toContainText('Posted to the world leaderboard');
        // No age question, no Parent step, and nothing stored for one
        await expect(sheet(page)).toBeHidden();
        expect((await savedPlayer(page)).parentOk).toBeUndefined();
      });
    });
  }

  test.describe('answered 13 on the age sheet', () => {
    test.use({ seedMode: 'challenger', seedConsent: null });
    test('the round posts as soon as 13 is picked, with no Parent step', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
      test.setTimeout(90_000);
      await page.clock.install();
      await arenaRound(page, 'challenger');
      await expect(sheet(page)).toBeVisible();
      expect(await scoreWrites(page)).toEqual([]);
      await sheet(page).getByRole('button', { name: '13', exact: true }).click();
      await expect(sheet(page)).toBeHidden();
      await expect.poll(async () => (await scoreWrites(page)).length).toBe(2);
      await expect(page.locator('.fx-toast').last()).toContainText('Posted to the world leaderboard');
      const p = await savedPlayer(page);
      expect(p.age).toBe(13);
      expect(p.parentOk).toBeUndefined();
    });
  });
});
