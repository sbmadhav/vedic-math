import { test, expect, APP, open, cloudLog, type Mode, typeAnswer } from './fixtures';
import type { Page } from '@playwright/test';

/* Posting consent (openspec posting-consent spec, docs/adr/0001): the Age answer is asked the first time a
   Ranked round's score would be posted, and a Player under 13 posts nothing, in any Mode, until a grown-up
   gives the Parent step on the Me page. Every write goes to the fake Firebase SDK (fixtures.ts), never live.
   The clock is faked so 60 second Arena rounds can be fast-forwarded. */

const TITLE: Record<Mode, string> = { explorer: 'How old are you?', challenger: 'How old are you?', pro: 'How old is this player?' };
const SAVED: Record<Mode, string> = {
  explorer: 'Saved on this device. Your score is on the This device board.',
  challenger: 'Saved on this device. It is on the This device board.',
  pro: 'Saved on this device. It ranks on the This device board.',
};
const ASK_GROWNUP: Record<Mode, string> = {
  explorer: 'A grown-up can turn on World boards on the Me page.',
  challenger: 'Ask a grown-up to turn on World boards on the Me page.',
  pro: 'A parent or guardian can turn on World boards on the Me page.',
};
/* The Arena round timer runs on requestAnimationFrame and performance.now, which WebKit's faked clock advances
   unevenly (a 60 second round can need far more than 60 faked seconds). The sheet and the Parent step still run
   on WebKit below (keyboard, reduced motion, 13 and over); the round-driven flows run on chromium and mobile. */
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
        // Under 13: still nothing posted, and the sheet says how a grown-up turns World boards on
        await expect(sheet(page).locator('h2')).toHaveText('Saved on this device');
        await expect(sheet(page)).toContainText('Ask a grown-up to turn on World boards.');
        await expect(sheet(page).getByRole('link', { name: 'For grown-ups: turn on World boards' })).toHaveAttribute('href', '#/me');
        await expect(sheet(page).getByRole('button', { name: 'OK' })).toBeFocused();
        expect((await savedPlayer(page)).age).toBe(Number(answer));
        expect(log.writes).toEqual([]);
        expect(log.signIns).toBe(0);
        await sheet(page).getByRole('button', { name: 'OK' }).click();
        await expect(sheet(page)).toBeHidden();
        // The next round asks nothing more and says where the score went and how to turn World boards on
        await arenaRound(page, mode);
        await expect(sheet(page)).toBeHidden();
        await expect(page.locator('.fx-toast').last()).toHaveText(`${SAVED[mode]} ${ASK_GROWNUP[mode]}`);
        expect((await cloudLog(page)).writes).toEqual([]);
        expect((await cloudLog(page)).authLoaded).toBe(false);
      }
    });
  });
}

/* An under-13 Player who chose Pro: nothing posts, then the Parent step, then posts, then withdrawn, nothing again */
test.describe('under 13 in Pro', () => {
  test.use({ seedMode: 'pro', seedConsent: { age: 9 } });
  test('posts nothing, posts after the Parent step, and nothing again after it is withdrawn', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
    test.setTimeout(120_000);
    await page.clock.install();
    await arenaRound(page, 'pro');
    await expect(sheet(page)).toBeHidden();
    await expect(page.locator('.fx-toast').last()).toHaveText(`${SAVED.pro} ${ASK_GROWNUP.pro}`);
    expect((await cloudLog(page)).writes).toEqual([]);
    // Play is never blocked: the round ranked on the Device board
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]').map((e: any) => e.score))).toEqual([10, 10]);

    // The Parent step on the Me page: the adult check first, then the switch
    await open(page, '#/me');
    const card = page.locator('#worldBoards');
    await expect(card).toContainText("This player's scores stay on this device until a parent or guardian turns on World boards here.");
    await expect(card.getByRole('switch')).toHaveCount(0);
    const form = card.locator('#wbCheck');
    await expect(form.locator('.wb-words')).toHaveText(/^[a-z]+ thousand(, [a-z]+ hundred)?( and [a-z-]+)?$/);
    await card.getByLabel(/Type this number in digits/).fill('1000');
    await card.getByRole('button', { name: 'Check' }).click();
    await expect(card.locator('#wbErr')).toHaveText('That is not the number. Try again.');
    await card.getByLabel(/Type this number in digits/).fill((await form.getAttribute('data-n'))!);
    await card.getByRole('button', { name: 'Check' }).click();
    const sw = card.getByRole('switch', { name: 'Allow World boards for Swift Tiger 42' });
    await expect(sw).toBeFocused();
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    expect((await savedPlayer(page)).parentOk).toBeUndefined(); // passing the check alone changes nothing
    await sw.click();
    await expect(card.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#wbMsg')).toHaveText('World boards are on for this player.');
    expect(typeof (await savedPlayer(page)).parentOk).toBe('number');

    // Now the next Daily challenge posts (to the fake SDK)
    await arenaRound(page, 'pro');
    await expect.poll(async () => (await arenaWrites(page)).length).toBe(2);
    await expect(page.locator('.fx-toast').last()).toContainText('Posted to the world leaderboard');

    // Withdrawn: the switch turns off, posting stops, nothing posted is deleted
    await open(page, '#/me');
    await expect(card).toContainText('A grown-up turned on World boards for this player on');
    await card.getByRole('switch').click();
    await expect(page.locator('#wbMsg')).toHaveText('World boards are off for this player. Nothing more is posted; entries already posted stay.');
    await expect(card.getByRole('switch')).toHaveCount(0);
    await expect(card.locator('#wbCheck')).toBeVisible(); // turning it on again needs the check again
    expect((await savedPlayer(page)).parentOk).toBeNull();
    await arenaRound(page, 'pro');
    await expect(page.locator('.fx-toast').last()).toHaveText(`${SAVED.pro} ${ASK_GROWNUP.pro}`);
    expect(await arenaWrites(page)).toHaveLength(2);
  });
});

test.describe('keyboard', () => {
  test('the age sheet and the Parent step work from the keyboard alone, and focus returns', async ({ page, browserName }) => {
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
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
    await expect(sheet(page).getByRole('link', { name: 'For grown-ups: turn on World boards' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(sheet(page)).toBeHidden();
    const input = page.locator('#wbIn');
    await expect(input).toBeFocused();
    await page.keyboard.type((await page.locator('#wbCheck').getAttribute('data-n'))!);
    await page.keyboard.press('Enter');
    await expect(page.locator('#worldBoards').getByRole('switch')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('#worldBoards').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(typeof (await savedPlayer(page)).parentOk).toBe('number');
    await expect(page.locator('#worldBoards').getByRole('switch')).toBeFocused();
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
  test('the Me page says this player posts, with no Parent step to give', async ({ page }) => {
    await page.goto(`${APP}#/me`);
    await expect(page.locator('#worldBoards')).toContainText('Your scores and weekly Sparks go on World boards.');
    await expect(page.locator('#worldBoards').getByRole('switch')).toHaveCount(0);
    await expect(page.locator('#wbCheck')).toHaveCount(0);
  });
});
