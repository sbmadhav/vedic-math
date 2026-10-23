import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, btn, missTwice, askFriend, turns, nextQuestion, overlaps } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Never in the way". */
test.use({ seedPlayer: ON });

test('A phone 320 pixels wide: the friends and the bubble do not overlap the question, the answer or the buttons', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, SKILL);
  await missTwice(page);
  await expect(visit(page)).toBeVisible();
  const v = (await visit(page).boundingBox())!;
  for (const sel of ['#prQ', '.ans-in', '#prCheck', '#prHint', '#prShow']) {
    const b = (await page.locator(`#practice ${sel}`).boundingBox())!;
    expect(overlaps(v, b), sel).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('Focus stays in the answer: a Visit opens while typing goes on into the answer field', async ({ page }) => {
  await page.clock.install();
  await open(page, SKILL);
  const input = page.locator('#practice .ans-in');
  await input.focus();
  await page.clock.fastForward(21_000);
  await expect(visit(page)).toBeVisible();
  await expect(input).toBeFocused();
  await page.keyboard.type('12');
  await expect(input).toHaveValue('12');
});

test('Escape: the Visit is gone', async ({ page }) => {
  await open(page, SKILL);
  await askFriend(page);
  await page.keyboard.press('Escape');
  await expect(visit(page)).toHaveCount(0);
});

test('Not now: later misses bring nobody, and Ask a friend still opens a Visit', async ({ page }) => {
  await open(page, SKILL);
  await missTwice(page);
  await turns(page);
  await btn(page, 'Not now').click();
  await expect(visit(page)).toHaveCount(0);
  await nextQuestion(page);
  await missTwice(page);
  await page.waitForTimeout(300);
  await expect(visit(page)).toHaveCount(0);
  await askFriend(page);
});
