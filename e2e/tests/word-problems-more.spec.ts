import { test, expect, open, cloudLog } from './fixtures';
import { box, label, onlyChoice, skip, startWordRound } from './word-kit';

/* Only Word problems and the Arena Word problems round (openspec change word-problems-more) beyond the coverage specs:
   Finish, the unit and the label in the shell in both color schemes, the Endless run without the choice, and the
   Pro style on a level's Only page. */

test('the Word problems round can be finished at any time, and nothing is posted', async ({ page }) => {
  await open(page, '#/arena');
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true'); // the daily challenge stays the default
  await startWordRound(page);
  for (let k = 0; k < 2; k++) { await page.keyboard.press('1'); await page.keyboard.press('Enter'); }
  await expect(page.locator('#arNum')).toHaveText('3/10');
  await page.locator('#arFinish').click();
  await expect(page.locator('.play-shell .ar-result')).toContainText('0 right · 2 missed');
  await expect(page.locator('.play-shell .ar-result')).toContainText('Practice rounds do not count for the leaderboard.');
  expect((await cloudLog(page)).writes.filter(w => /^boards\//.test(w.path))).toEqual([]);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`an Arena story: label, story and unit stay inside the round, readable (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, '#/arena');
    await startWordRound(page);
    let unit = false;
    for (let k = 0; k < 10 && !unit; k++) { if (await page.locator('.ar-unit').count()) unit = true; else { await page.keyboard.press('1'); await page.keyboard.press('Enter'); } }
    expect(unit, 'a story with a unit within 10 questions').toBe(true);
    const round = await page.locator('.play-shell .ar').boundingBox(), q = await page.locator('#arQ').boundingBox();
    expect(q!.x).toBeGreaterThanOrEqual(round!.x - 1);
    expect(q!.x + q!.width).toBeLessThanOrEqual(round!.x + round!.width + 1);
    const colors = await page.locator('#arStory').evaluate(el => { const s = getComputedStyle(el); return [s.color, s.backgroundColor]; });
    expect(colors[0]).not.toBe(colors[1]);
    await expect(page.locator('.ar-unit')).toBeVisible();
  });
}

test('an Endless run keeps its mix: no Only Word problems choice', async ({ page }) => {
  await open(page, '#/mix/3');
  await expect(onlyChoice(page, true)).toBeVisible();
  await open(page, '#/run/3');
  await expect(box(page).locator('#prQ')).toBeVisible();
  await expect(page.locator('#mixOnly')).toHaveCount(0);
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('Only Word problems on Grade 8 asks Word problems from the first question, with the read-then-plan hints', async ({ page }) => {
    await open(page, '#/mix/8/words');
    for (let i = 1; i <= 3; i++) {
      await expect(label(page), `question ${i}`).toHaveText('Word problem');
      await box(page).locator('#prHint').click();
      await expect(box(page).locator('#prSay')).toContainText('What is it asking?');
      if (i < 3) await skip(page);
    }
  });
});
