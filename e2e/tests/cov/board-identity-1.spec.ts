import { test, expect, open, cloudLog, heldClock, showWorld, needsWorldBoards } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec board-identity (change learnvedicmath): "No identity before the first post". World boards are shown only
   to a Player whose Age answer is 13 or over, after a tap on Show World board.
   The fake Firebase SDK (fixtures) records sign-ins; the fixtures also fail the test on any request to
   identitytoolkit / securetoken (a real sign-in request). An identity would show up as a saved uid
   (vm.cloudUids / vm.cloudUid) or a fake Auth session (e2e.fakeAuth). */

const identity = (page: Page) => page.evaluate(() => ({
  uids: localStorage.getItem('vm.cloudUids'),
  legacy: localStorage.getItem('vm.cloudUid'),
  session: localStorage.getItem('e2e.fakeAuth'),
}));
const NO_IDENTITY = { uids: null, legacy: null, session: null };

const ROWS = [['u1', 'Brave Panda 12', 480], ['u2', 'Lucky Otter 17', 360], ['u3', 'Calm Heron 5', 220]] as const;

async function seedRows(page: Page) {
  await page.addInitScript(rows => { (globalThis as any).__e2eRows = rows; }, ROWS as unknown as [string, string, number][]);
}

async function expectWorldTop(page: Page, sel: string) {
  const wrap = page.locator(sel);
  await showWorld(page, sel);
  const items = wrap.locator('ol.lb li');
  await expect(items).toHaveCount(ROWS.length);
  for (let i = 0; i < ROWS.length; i++) {
    await expect(items.nth(i).locator('.lb-rank')).toHaveText(String(i + 1));
    await expect(items.nth(i).locator('.lb-name')).toHaveText(ROWS[i][1]);
    await expect(items.nth(i).locator('b')).toHaveText(ROWS[i][2].toLocaleString('en-US'));
  }
  // Nobody is "me": this Player has no identity
  await expect(wrap.locator('li.me')).toHaveCount(0);
}

test.describe('Viewing a World board on a fresh device', () => {
  test.use({ seedConsent: { age: 13 } });
  test('a Player 13 or over who has never posted sees the Arena World boards\' top entries, with no sign-in', async ({ page }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    await seedRows(page);
    await open(page, '#/arena');
    for (const sel of ['#lbDay', '#lbWeek', '#lbSparks']) await expectWorldTop(page, sel);
    const log = await cloudLog(page);
    expect(log.reads.length).toBeGreaterThanOrEqual(3);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(log.writes).toEqual([]);
    expect(await identity(page)).toEqual(NO_IDENTITY);
  });

  test('a game page\'s World boards show their top entries, with no sign-in', async ({ page }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    await seedRows(page);
    await open(page, '#/game/times-sprint');
    await showWorld(page, '#gbDay');
    const wrap = page.locator('#gbDay');
    await expect(wrap.locator('ol.lb li')).toHaveCount(ROWS.length);
    await expect(wrap.locator('ol.lb li .lb-name').first()).toHaveText(ROWS[0][1]);
    const log = await cloudLog(page);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(log.writes).toEqual([]);
    expect(await identity(page)).toEqual(NO_IDENTITY);
  });

  test.describe('with no Player yet', () => {
    test.use({ seedMode: null });
    test('a first visit that opens the Arena makes no sign-in and creates no identity', async ({ page }) => {
      await seedRows(page);
      await page.goto('/learn/arena');
      await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
      // With no Age answer only the Device board is shown: nothing is read either
      if (await page.locator('#lbDay').count()) await expect(page.locator('#lbDay [data-src="world"], #lbDay [data-show-world]')).toHaveCount(0);
      const log = await cloudLog(page);
      expect(log.reads).toEqual([]);
      expect(log.signIns).toBe(0);
      expect(log.authLoaded).toBe(false);
      expect(log.writes).toEqual([]);
      expect(await identity(page)).toEqual(NO_IDENTITY);
    });
  });
});

/* Earning Sparks without being allowed to post: collect sutra cards (5 Sparks each) past the weekly Sparks
   board's minimum of 10, then let the posting timer (3 s, at most once a minute) run out. */
async function earnSparks(page: Page) {
  await heldClock(page);
  await open(page, '#/sutras');
  for (const i of [0, 1, 2, 3]) {
    await page.locator('.sutra-card .sutra-face').nth(i).click();
    await page.clock.runFor(1_000);
  }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').sparks)).toBe(20);
  await page.clock.runFor(130_000);
}

async function expectNoIdentity(page: Page) {
  const log = await cloudLog(page);
  expect(log.signIns).toBe(0);
  expect(log.authLoaded).toBe(false);
  expect(log.writes).toEqual([]);
  expect(await identity(page)).toEqual(NO_IDENTITY);
}

test.describe('Earning XP without posting', () => {
  test.describe('no Age answer', () => {
    test.use({ seedConsent: null });
    test('Sparks earned with no Age answer make no sign-in request and create no identity', async ({ page }) => {
      await earnSparks(page);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0].age)).toBeUndefined();
      await expectNoIdentity(page);
    });
  });

  test.describe('under 13', () => {
    test.use({ seedConsent: { age: 9 } });
    test('Sparks earned by an under-13 Player make no sign-in request and create no identity', async ({ page }) => {
      await earnSparks(page);
      await expectNoIdentity(page);
    });
  });
});
