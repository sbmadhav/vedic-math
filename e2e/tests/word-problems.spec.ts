import { test, expect, open } from './fixtures';
import { READY, box, label, skip } from './word-kit';

/* Word problems (openspec change word-problems) beyond the coverage specs: Endless practice mixes them in, the unit
   sits beside the answer box, and the story is drawn in both color schemes without leaving the card. */

test.describe('Challenger with 20 answers', () => {
  test.use({ seedMode: 'challenger', seedProgress: READY });

  test('Endless practice mixes a Word problem in within the first few questions', async ({ page }) => {
    await open(page, '#/mix/3');
    let seen = false;
    for (let i = 0; i < 12 && !seen; i++) { if (await label(page).count()) seen = true; else await skip(page); }
    expect(seen).toBe(true);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`a Word problem's unit sits beside the box and the story stays inside the card (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, '#/skill/3-twostep');
      await expect(label(page)).toBeVisible();
      await expect(box(page).locator('.pr-unit')).toBeVisible();
      const card = await box(page).boundingBox(), q = await box(page).locator('#prQ').boundingBox();
      expect(q!.x + q!.width).toBeLessThanOrEqual(card!.x + card!.width + 1);
      const colors = await label(page).evaluate(el => { const s = getComputedStyle(el); return [s.color, s.backgroundColor]; });
      expect(colors[0]).not.toBe(colors[1]);
    });
  }
});
