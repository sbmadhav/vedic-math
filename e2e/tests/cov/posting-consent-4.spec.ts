import { test, expect, open, cloudLog, heldClock, type Mode, typeAnswer } from '../fixtures';
import type { Page } from '@playwright/test';

/* posting-consent spec (change learnvedicmath), Requirement "Play is never blocked", Scenario "Under-13 Player
   without the Parent step plays the Arena": the round plays normally and its Score ranks on the Device board, the only
   Board an under-13 Player sees. e2e/tests/consent.spec.ts covers Pro. These tests cover Explorer and Challenger and
   check the ranking where the Player sees it. Every write goes to the fake Firebase SDK. */

const ROUNDS_OFF_WEBKIT = "Arena rounds need the faked clock, which WebKit's requestAnimationFrame does not follow evenly";

/** Plays today's Arena Daily challenge with one right answer (score 10) and lets the 60 seconds run out. */
async function arenaRound(page: Page, mode: Mode) {
  await open(page, '#/arena');
  const answer = await page.evaluate(async m => {
    const cloud = await import('/js/cloud.js' as string), arena = await import('/js/arena.js' as string);
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
}

const SAVED: Record<'explorer' | 'challenger', string> = {
  explorer: 'Saved on this device. Your score is on the This device board. Your scores stay on this device.',
  challenger: "Saved on this device. It is on the This device board. Your scores stay on this device's board.",
};

for (const mode of ['explorer', 'challenger'] as const) {
  test.describe(`under 13, ${mode}`, () => {
    test.use({ seedMode: mode, seedConsent: { age: 9 } });

    test(`${mode}: the Arena Daily round plays normally and ranks on the Device board`, async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', ROUNDS_OFF_WEBKIT);
      test.setTimeout(90_000);
      await heldClock(page);
      await arenaRound(page, mode);

      // The round plays normally: the result with its Score, no age question, nothing posted
      const result = page.locator('.ar-result');
      await expect(result).toBeVisible();
      await expect(result.locator('.md-value')).toHaveText('10');
      await expect(result).toContainText('1 right');
      await expect(page.locator('dialog.vm-sheet')).toBeHidden();
      await expect(page.locator('.fx-toast').last()).toHaveText(SAVED[mode]);
      const log = await cloudLog(page);
      expect(log.writes).toEqual([]);
      expect(log.signIns).toBe(0);

      // The Score ranks on the Device board: first on today's and this week's boards, which show this device only
      await page.locator('#arDone').click(); // Back from the result in the play shell to the Arena's boards
      for (const id of ['#lbDay', '#lbWeek']) {
        const board = page.locator(id);
        await expect(board.locator('.lb-src')).toHaveText('This device');
        await expect(board.locator('[data-src="world"], [data-show-world]')).toHaveCount(0);
        const me = board.locator('ol.lb li.me');
        await expect(me).toHaveCount(1);
        await expect(me.locator('.lb-rank')).toHaveText('1');
        await expect(me.locator('.lb-name')).toHaveText('Swift Tiger 42');
        await expect(me.locator('b')).toHaveText('10');
      }
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]').map((e: any) => e.score))).toEqual([10, 10]);
      expect((await cloudLog(page)).writes).toEqual([]);
    });
  });
}
