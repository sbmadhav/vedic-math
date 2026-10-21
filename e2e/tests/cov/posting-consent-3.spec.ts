import { test, expect, open, cloudLog, type Mode, typeAnswer, FIREBASE_SDK, needsWorldBoards } from '../fixtures';
import type { Page } from '@playwright/test';

/* posting-consent spec (change learnvedicmath), Requirement "Players under 13 use Device boards only":
   - "Under-13 Player in Pro mode": a Ranked round posts nothing, loads no Firebase file, ranks on the Device board,
     and the Player is told their Scores stay on this device;
   - "No switch for grown-ups": the Me page has no control that would let that Player post;
   - "Imported Parent step": a Player who had the Parent step on sbmadhav.com posts nothing here.
   Also "Players 13 and over" post a Ranked round's Score as before.
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
    const cloud = await e2eMod('cloud'), arena = await e2eMod('arena');
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
  await page.clock.fastForward(61_000);
  await expect(page.locator('.ar-result')).toBeVisible();
}

const sdkRequests = (page: Page) => { const seen: string[] = []; page.on('request', r => { if (FIREBASE_SDK.test(r.url()) || /recaptcha/.test(r.url())) seen.push(r.url()); }); return seen; };

test.describe('Under-13 Player in Pro mode', () => {
  test.use({ seedMode: 'pro', seedConsent: { age: 11 }, seedProgress: { v: 3, sparks: 40, weekSparks: { [isoWeek()]: 40 } } });
  test('a Ranked round posts nothing, Score or Sparks, loads no Firebase file, and ranks on the Device board', async ({ page, browserName }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(120_000);
    const sdk = sdkRequests(page);
    await page.clock.install();
    await arenaRound(page, 'pro');
    await expect(page.locator('.fx-toast').last()).toHaveText("Saved on this device. It ranks on the This device board. This player's scores stay on this device's board.");
    await page.clock.runFor(70_000); // past the weekly Sparks post's wait
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(sdk).toEqual([]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]').map((e: any) => e.score))).toEqual([10, 10]);
  });
});

test.describe('No switch for grown-ups', () => {
  for (const mode of ['explorer', 'challenger', 'pro'] as Mode[]) {
    test.describe(mode, () => {
      test.use({ seedMode: mode, seedConsent: { age: 9 } });
      test(`${mode}: the Me page has no control that would let an under-13 Player post`, async ({ page }) => {
        await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
        await open(page, '#/me');
        const card = page.locator('#worldBoards .wb-body');
        await expect(card).toContainText(/scores stay on this device/);
        await expect(card.locator('button, input, [role="switch"], form, a')).toHaveCount(0);
      });
    });
  }
});

test.describe('Imported Parent step', () => {
  test.use({ seedMode: 'challenger', seedConsent: { age: 10, parentOk: 1760000000000 } });
  test('a Player under 13 who had the Parent step on sbmadhav.com posts nothing on learnvedicmath.com', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(90_000);
    const sdk = sdkRequests(page);
    await page.clock.install();
    await arenaRound(page, 'challenger');
    await page.clock.runFor(70_000);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(sdk).toEqual([]);
  });
});

test.describe('Players 13 and over', () => {
  for (const { mode, age } of [{ mode: 'challenger' as Mode, age: 13 }, { mode: 'explorer' as Mode, age: 16 }, { mode: 'pro' as Mode, age: 17 }]) {
    test.describe(`${mode}, age ${age}`, () => {
      test.use({ seedMode: mode, seedConsent: { age } });
      test(`${mode}: age ${age} posts a Ranked round's Score`, async ({ page, browserName }) => {
        await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
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
        // No age question
        await expect(sheet(page)).toBeHidden();
        expect((await savedPlayer(page)).parentOk).toBeUndefined();
      });
    });
  }

  test.describe('answered 13 on the age sheet', () => {
    test.use({ seedMode: 'challenger', seedConsent: null });
    test('the round posts as soon as 13 is picked', async ({ page, browserName }) => {
      await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
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
