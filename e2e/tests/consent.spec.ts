import { test, expect, APP, open, cloudLog, type Mode, typeAnswer, FIREBASE_SDK } from './fixtures';
import type { Page } from '@playwright/test';

/* Posting consent (openspec posting-consent spec, change learnvedicmath; docs/adr/0001, 0006): the Age answer is
   asked the first time a Ranked round's score would be posted, and a Player whose answer is under 13 uses Device
   boards only, in every Mode: nothing is posted, nothing loads Firebase, and there is no switch to turn World boards
   on. Every write goes to the fake Firebase SDK (fixtures.ts), never live. The clock is faked so 60 second Arena
   rounds can be fast-forwarded. */

const TITLE: Record<Mode, string> = { explorer: 'How old are you?', challenger: 'How old are you?', pro: 'How old is this player?' };
const SAVED: Record<Mode, string> = {
  explorer: 'Saved on this device. Your score is on the This device board.',
  challenger: 'Saved on this device. It is on the This device board.',
  pro: 'Saved on this device. It ranks on the This device board.',
};
const DEVICE_ONLY: Record<Mode, string> = {
  explorer: 'Your scores stay on this device.',
  challenger: "Your scores stay on this device's board.",
  pro: "This player's scores stay on this device's board.",
};
const SHEET_DEVICE_ONLY: Record<Mode, string> = {
  explorer: 'Your score is on the This device board. Your scores stay on this device.',
  challenger: "Your score is on the This device board. Your scores stay on this device's board.",
  pro: "The score ranks on the This device board. This player's scores stay on this device's board.",
};
/* Every request for the Firebase SDK (served from this site) */
const sdkRequests = (page: Page) => { const seen: string[] = []; page.on('request', r => { if (FIREBASE_SDK.test(r.url()) || /recaptcha/.test(r.url())) seen.push(r.url()); }); return seen; };
/* The Arena round timer runs on requestAnimationFrame and performance.now, which WebKit's faked clock advances
   unevenly (a 60 second round can need far more than 60 faked seconds). The sheet still runs on WebKit below
   (keyboard, reduced motion, 13 and over); the round-driven flows run on chromium and mobile. */
const ROUNDS_OFF_WEBKIT = "Arena rounds need the faked clock, which WebKit's requestAnimationFrame does not follow evenly";
const sheet = (page: Page) => page.locator('dialog.vm-sheet');
const arenaWrites = async (page: Page) => (await cloudLog(page)).writes.filter(w => /^boards\/(daily|week)-/.test(w.path));
const savedPlayer = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vm.players')!).list[0]);

/** Plays today's Arena Daily challenge with one right answer (score 10) and lets the 60 seconds run out. */
async function arenaRound(page: Page, mode: Mode) {
  if (!page.url().endsWith('#/arena')) await open(page, '#/arena');
  // The last round's result is still in the play shell: Back to the Arena
  if (await page.locator('#arDone').isVisible()) await page.locator('#arDone').click();
  const answer = await page.evaluate(async m => {
    const cloud = await import('/vedic-math/js/cloud.js' as string), arena = await import('/vedic-math/js/arena.js' as string);
    return String(arena.dailySet(m, cloud.dayId())[0].answer);
  }, mode);
  await page.locator('#arGo').click();
  await page.clock.runFor(2_500); // 3, 2, 1
  if (mode === 'explorer') await page.locator(`.ar-choice[data-v="${answer}"]`).click();
  else {
    // Typed, not tapped: the keypad enters each tap twice from round 2 (PLAN.md Phase 0, bug 1)
    await typeAnswer(page, answer);
    await page.locator('#arForm button').click();
  }
  await expect(page.locator('#arScore')).toHaveText('10');
  await page.clock.runFor(61_000);
  await expect(page.locator('.ar-result')).toBeVisible();
}

/* Answer, dismiss and re-offer in every Mode. Explorer and Challenger answer under 13; Pro answers Grown-up. */
const FLOW: { mode: Mode; dismiss: 'Escape' | 'Not now' | 'Close'; answer: string }[] = [
  { mode: 'explorer', dismiss: 'Escape', answer: '6' },
  { mode: 'challenger', dismiss: 'Not now', answer: '11' },
  { mode: 'pro', dismiss: 'Close', answer: 'Grown-up' },
];
for (const { mode, dismiss, answer } of FLOW) {
  test.describe(mode, () => {
    test.use({ seedMode: mode });
    test(`${mode}: the age question after a Daily challenge, dismissed, offered again, then answered`, async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
      test.setTimeout(90_000);
      const sent: string[] = [];
      page.on('request', r => { const d = r.postData(); if (d) sent.push(`${r.url()} ${d}`); });
      const sdk = sdkRequests(page);
      await page.clock.install();
      await arenaRound(page, mode);

      // The question appears before anything is posted, worded for the Mode, with no hint of what any answer allows
      await expect(sheet(page)).toBeVisible();
      await expect(sheet(page).locator('h2')).toHaveText(TITLE[mode]);
      await expect(sheet(page).locator('[data-age]')).toHaveCount(14);
      await expect(sheet(page).locator('[data-age]').first()).toBeFocused();
      await expect(sheet(page)).not.toContainText(/world|leaderboard|post|unlock|under 13|13 or|allow/i);
      expect(await arenaWrites(page)).toEqual([]);
      // The score is on the Device board either way
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]').length)).toBe(2);

      // Dismissed: nothing is posted or stored, and the toast says where the score went
      if (dismiss === 'Escape') await page.keyboard.press('Escape');
      else await sheet(page).getByRole('button', { name: dismiss }).click();
      await expect(sheet(page)).toBeHidden();
      await expect(page.locator('.fx-toast').last()).toHaveText(SAVED[mode]);
      expect((await savedPlayer(page)).age).toBeUndefined();
      expect(await arenaWrites(page)).toEqual([]);

      // The next would-be post offers it again
      await arenaRound(page, mode);
      await expect(sheet(page)).toBeVisible();
      await sheet(page).getByRole('button', { name: answer, exact: true }).click();
      const log = await cloudLog(page);
      if (answer === 'Grown-up') {
        await expect(sheet(page)).toBeHidden();
        await expect.poll(async () => (await arenaWrites(page)).length).toBe(2);
        await expect(page.locator('.fx-toast').last()).toContainText('Posted to the world leaderboard');
        expect((await savedPlayer(page)).age).toBe('adult');
        // The Age answer never leaves the device
        for (const w of await arenaWrites(page)) expect(Object.keys(w.data).sort()).toEqual(['avatar', 'exp', 'name', 'score', 'ts']);
        expect(sent.filter(x => /"?age"?\s*[:=]|adult/.test(x))).toEqual([]);
      } else {
        // Under 13: nothing posted, ever; the sheet says the scores stay on this device, with nothing to turn on
        await expect(sheet(page).locator('h2')).toHaveText('Saved on this device');
        await expect(sheet(page).locator('#ageSub')).toHaveText(SHEET_DEVICE_ONLY[mode]);
        await expect(sheet(page).getByRole('link')).toHaveCount(0);
        await expect(sheet(page)).not.toContainText(/grown-up|turn on|World boards/i);
        await expect(sheet(page).getByRole('button', { name: 'OK' })).toBeFocused();
        expect((await savedPlayer(page)).age).toBe(Number(answer));
        expect(log.writes).toEqual([]);
        expect(log.signIns).toBe(0);
        await sheet(page).getByRole('button', { name: 'OK' }).click();
        await expect(sheet(page)).toBeHidden();
        // The next round asks nothing more and says where the score went
        await arenaRound(page, mode);
        await expect(sheet(page)).toBeHidden();
        await expect(page.locator('.fx-toast').last()).toHaveText(`${SAVED[mode]} ${DEVICE_ONLY[mode]}`);
        expect((await cloudLog(page)).writes).toEqual([]);
        expect((await cloudLog(page)).authLoaded).toBe(false);
        expect(sdk, 'no Firebase or reCAPTCHA file for an under-13 Player').toEqual([]);
      }
    });
  });
}

/* An under-13 Player who chose Pro (posting-consent "Under-13 Player in Pro mode", "No switch for grown-ups") */
test.describe('under 13 in Pro', () => {
  test.use({ seedMode: 'pro', seedConsent: { age: 11 } });
  test('a Ranked round posts nothing and loads no Firebase file; the Score is on the Device board; the Me page has no switch', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(90_000);
    const sdk = sdkRequests(page);
    await page.clock.install();
    await arenaRound(page, 'pro');
    await expect(sheet(page)).toBeHidden();
    await expect(page.locator('.fx-toast').last()).toHaveText(`${SAVED.pro} ${DEVICE_ONLY.pro}`);
    expect((await cloudLog(page)).writes).toEqual([]);
    // Play is never blocked: the round ranked on the Device board
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]').map((e: any) => e.score))).toEqual([10, 10]);
    expect(sdk).toEqual([]);

    await open(page, '#/me');
    const card = page.locator('#worldBoards');
    await expect(card).toContainText("This player's scores stay on this device's board: nothing is posted to World boards for a player under 13.");
    await expect(card.getByRole('switch')).toHaveCount(0);
    await expect(card.locator('form, input')).toHaveCount(0);
    expect(sdk).toEqual([]);
  });
});

/* A Player imported from sbmadhav.com with the old Parent step (posting-consent "Imported Parent step") */
test.describe('under 13 with the old Parent step', () => {
  test.use({ seedMode: 'explorer', seedConsent: { age: 10, parentOk: 1760000000000 } });
  test('still posts nothing and loads no Firebase file', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(90_000);
    const sdk = sdkRequests(page);
    await page.clock.install();
    await arenaRound(page, 'explorer');
    await expect(page.locator('.fx-toast').last()).toHaveText(`${SAVED.explorer} ${DEVICE_ONLY.explorer}`);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(sdk).toEqual([]);
  });
});

test.describe('keyboard', () => {
  test('the age sheet works from the keyboard alone, and an under-13 answer is said plainly', async ({ page, browserName }) => {
    // Safari moves Tab only through fields and links unless Option is held
    const TAB = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await open(page, '#/me');
    const ask = page.locator('#wbAsk');
    await ask.focus();
    await page.keyboard.press('Enter');
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).locator('[data-age="5"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(sheet(page)).toBeHidden();
    await expect(ask).toBeFocused();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 3; i++) await page.keyboard.press(TAB);
    await expect(sheet(page).locator('[data-age="8"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(sheet(page).getByRole('button', { name: 'OK' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(sheet(page)).toBeHidden();
    await expect(page.locator('#worldBoards')).toContainText("Your scores stay on this device's board.");
    expect((await savedPlayer(page)).age).toBe(8);
    expect((await savedPlayer(page)).parentOk).toBeUndefined();
  });
});

test('reduced motion: the age sheet opens without animation', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#wbAsk').click();
  await expect(sheet(page)).toBeVisible();
  expect(await sheet(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test.describe('13 and over', () => {
  test.use({ seedConsent: { age: 13 } });
  test('the Me page says this player posts, with no switch', async ({ page }) => {
    await page.goto(`${APP}#/me`);
    await expect(page.locator('#worldBoards')).toContainText('Your scores and weekly Sparks go on World boards.');
    await expect(page.locator('#worldBoards').getByRole('switch')).toHaveCount(0);
  });

  test('the Arena shows the Device board, and the World board only after a tap on Show World board', async ({ page }) => {
    const sdk = sdkRequests(page);
    await open(page, '#/arena');
    const day = page.locator('#lbDay');
    await expect(day.locator('[data-src="device"]')).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(500);
    expect(sdk, 'nothing reaches Firebase before the tap').toEqual([]);
    expect((await cloudLog(page)).reads).toEqual([]);
    await day.getByRole('button', { name: 'Show World board' }).click();
    await expect(day.locator('[data-src="world"]')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(async () => (await cloudLog(page)).reads.length).toBeGreaterThan(0);
    expect((await cloudLog(page)).signIns).toBe(0);
  });
});

/* Board-identity "Under-13 Player opens the Boards": only the Device board, and no request leaves the device */
for (const mode of ['explorer', 'challenger', 'pro'] as const) {
  test.describe(`under 13 in ${mode}`, () => {
    test.use({ seedMode: mode, seedConsent: { age: 9 } });
    test('the Boards show this device only, say so, and nothing loads from Firebase', async ({ page }) => {
      const sdk = sdkRequests(page);
      await open(page, '#/arena');
      const day = page.locator('#lbDay');
      await expect(day).toContainText('This device');
      await expect(day.locator('[data-src="world"], [data-show-world]')).toHaveCount(0);
      await expect(day.locator('.lb-why')).toHaveText(DEVICE_ONLY[mode]);
      await page.waitForTimeout(500);
      expect(sdk).toEqual([]);
      expect((await cloudLog(page)).reads).toEqual([]);
    });
  });
}
