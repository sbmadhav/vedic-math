import { test, expect, open, heldClock } from '../fixtures';

/* openspec star-round, "A miss replays the Trick on the Player's number": Skip the replay, and Rematch missed.
   A Star round on Square numbers ending in 5: every question is n², so answers are worked out from the page.
   The clock is held so the replay's steps (one every 2.5 s) only move when the test moves them. */

type Page = import('@playwright/test').Page;
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
async function enter(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }

/** Misses question 1 and waits for its replay to show its first step (and only that one) */
async function missIntoReplay(page: Page) {
  await heldClock(page);
  await open(page, '#/star/sq5/1');
  await question(page, 1);
  const n = await base(page);
  await enter(page, '1');
  await expect(page.locator('#stSay')).toContainText('Not quite');
  await page.clock.runFor(1000); // the 900 ms pause before the replay
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(page.locator('.star-step')).toHaveCount(1); // the replay is still running: more steps to come
  await expect(page.locator('#stRSkip')).toHaveText('Skip');
  return n;
}

/** The rematch is on screen at once: no clock movement was needed, and it is the same kind as the miss */
async function rematchAtOnce(page: Page, n: number) {
  await expect(tag(page)).toHaveText('Rematch');
  await expect(page.locator('.star-replay')).toHaveCount(0);
  await expect(page.locator('#stSay')).toContainText('Your turn. One just like it.');
  const m = await base(page);
  expect(m).not.toBe(n);
  expect(String(m).length).toBe(String(n).length);
  expect(m % 10).toBe(5);
}

test.describe('Skip the replay', () => {
  test('pressing Skip during the replay ends it and asks the rematch at once', async ({ page }) => {
    const n = await missIntoReplay(page);
    await page.locator('#stRSkip').click();
    await rematchAtOnce(page, n);
    // Time passing later does not bring the replay back
    await page.clock.runFor(10_000);
    await expect(tag(page)).toHaveText('Rematch');
    await expect(page.locator('.star-step')).toHaveCount(0);
  });

  test('pressing Escape during the replay ends it and asks the rematch at once', async ({ page }) => {
    const n = await missIntoReplay(page);
    await page.keyboard.press('Escape');
    await rematchAtOnce(page, n);
    await page.clock.runFor(10_000);
    await expect(tag(page)).toHaveText('Rematch');
    await expect(page.locator('.star-step')).toHaveCount(0);
  });
});

test.describe('Rematch missed', () => {
  test('a missed rematch shows its right answer, no second replay, and the next main question follows', async ({ page }) => {
    const n = await missIntoReplay(page);
    await page.locator('#stRSkip').click();
    await rematchAtOnce(page, n);
    const m = await base(page);
    const right = String(m * m);
    await enter(page, right === '1' ? '2' : '1');
    // Its right answer is shown
    await expect(page.locator('#stSay')).toContainText(`Close! It is ${right}`);
    await expect(page.locator('#stSay b')).toHaveText(right);
    // No second replay, however long the Player waits
    await page.clock.runFor(10_000);
    await expect(page.locator('.star-replay')).toHaveCount(0);
    await expect(page.locator('.star-step')).toHaveCount(0);
    await expect(tag(page)).toHaveText('Rematch');
    // Then the next main question
    await expect(page.locator('#stNext')).toHaveText('Next question');
    // The Next button can appear under the spot just tapped; move the pointer off so its hover lift does not jitter
    await page.mouse.move(0, 0);
    await page.locator('#stNext').click();
    await question(page, 2);
    await expect(page.locator('.star-replay')).toHaveCount(0);
    await expect(page.locator('#stDots i').first()).toHaveClass(/\bmiss\b/);
  });
});
