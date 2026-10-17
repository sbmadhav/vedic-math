import { test, expect, open, cloudLog, heldClock, appErrors } from '../fixtures';
import type { Page } from '@playwright/test';

/* view-lifecycle spec, "One tap, one action / Explorer tap in round 2".
   The Arena keypad scenario is already asserted in e2e/tests/arena.spec.ts ('second Arena round: keypad taps
   1 then 2 enter 12'). The existing Explorer test checks one answer at the end of the round; this one also checks
   that a single tap moves the round to the next question exactly once (one redraw of the question and choices,
   one status message, one Score change). Practice rounds never post a Score. */

async function endRound(page: Page) {
  await page.clock.fastForward(61_000);
  await page.clock.runFor(100);
}
async function practiceRound(page: Page) {
  await page.locator('[data-t="practice"]').click();
  await page.locator('#arGo').click();
  await page.clock.runFor(2200); // the 3, 2, 1 countdown
  await expect(page.locator('#arQ')).not.toBeEmpty();
}

test.describe('Explorer, second Arena round', () => {
  test.use({ seedMode: 'explorer' });

  test('one choice tap answers exactly one question and moves on once', async ({ page, issues }) => {
    await heldClock(page);
    await open(page, '#/arena');
    await practiceRound(page);
    await endRound(page);
    await expect(page.locator('.play-shell .ar-result')).toBeVisible();
    await page.locator('#arDone').click(); // the result shows in the play shell; Back to the Arena

    await practiceRound(page);
    await expect(page.locator('.ar-choice').first()).toBeVisible();
    // Count every redraw of the question, the choices, the status line and the Score from here on
    await page.evaluate(() => {
      const w = window as any; w.__vl = { q: 0, choices: 0, say: 0, score: 0 };
      const watch = (sel: string, key: string) => new MutationObserver(recs => { w.__vl[key] += recs.length; })
        .observe(document.querySelector(sel)!, { childList: true, characterData: true, subtree: true });
      watch('#arQ', 'q'); watch('#arIn', 'choices'); watch('#arSay', 'say'); watch('#arScore', 'score');
    });
    const choice = page.locator('.ar-choice').first();
    const tapped = await choice.getAttribute('data-v');
    await choice.click();
    await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
    await page.clock.runFor(1000); // let any late handler or timer run
    const counts = await page.evaluate(() => (window as any).__vl);
    expect(counts).toEqual({ q: 1, choices: 1, say: 1, score: 1 });
    // The single answer is reflected once in the Score: +10 for a right first answer, 0 for a miss
    const right = (await page.locator('#arPop').textContent())!.startsWith('+');
    await expect(page.locator('#arScore')).toHaveText(right ? '10' : '0');
    expect(tapped).not.toBeNull();
    // A fresh set of choices is ready for the next question
    await expect(page.locator('.ar-choice').first()).toBeVisible();

    await endRound(page);
    await expect(page.locator('.ar-result p').first()).toHaveText(right ? /^1 right · 0 missed/ : /^0 right · 1 missed/);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
