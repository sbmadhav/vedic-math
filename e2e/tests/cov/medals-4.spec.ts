import { test, expect, open, hrefTo } from '../fixtures';

/* medals spec:
   - Requirement: Katas are done or not done
   - Scenario: Dojo counts: a Player opens the Dojo or a Trick's Katas; it shows how many Katas are done, and no
     star count.
   Saved progress (v3) marks 3 sq5 Katas and 2 from9 Katas done, so the counts are not the trivial 0 or 1. */

const v3 = (katasDone: Record<string, number>) => ({ v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, medals: {}, katasDone, ratings: {}, weekSparks: {}, questDay: null });
const STAR_COUNT = /★|\d+\s*(\/\s*\d+\s*)?stars?\b/i;

test.describe('Dojo counts', () => {
  test.use({ seedProgress: v3({ 'k:sq5:1': 1, 'k:sq5:2': 1, 'k:sq5:3': 1, 'k:from9:1': 1, 'k:from9:2': 1 }) });

  test('the Dojo shows how many Katas are done, in all and per Trick, and no star count', async ({ page }) => {
    await open(page, '#/dojo');
    const total = page.locator('#view p.mq-small').filter({ hasText: 'katas done' });
    await expect(total).toHaveText('5 of 1,050 katas done');
    await expect(page.locator(`a.dojo-katas${hrefTo('#/katas/sq5')}`)).toHaveText(/Katas 3\/50 done/);
    await expect(page.locator(`a.dojo-katas${hrefTo('#/katas/from9')}`)).toHaveText(/Katas 2\/50 done/);
    await expect(page.locator(`a.dojo-katas${hrefTo('#/katas/by11')}`)).toHaveText(/Katas 0\/50 done/);
    // No star count anywhere a Kata count is shown
    await expect(page.locator('#view')).not.toContainText('★');
    await expect(total).not.toHaveText(STAR_COUNT);
    for (const t of await page.locator('a.dojo-katas').allTextContents()) expect(t).not.toMatch(STAR_COUNT);
  });

  test("a Trick's Katas show how many are done, which ones, and no star count", async ({ page }) => {
    await open(page, '#/katas/sq5');
    await expect(page.locator('#view h1')).toContainText('50 katas');
    await expect(page.locator('#view .mq-small').first()).toContainText('3 of 50 done');
    for (const n of [1, 2, 3]) {
      const node = page.locator(`a.lv-node${hrefTo(`#/kata/sq5/${n}`)}`);
      await expect(node).toHaveAttribute('aria-label', `Kata ${n}, done`);
      await expect(node.locator('.kata-mark')).toHaveClass(/\bon\b/);
    }
    // Kata 4 is open (Kata 3 is done) but not done; Kata 5 stays locked
    const k4 = page.locator(`a.lv-node${hrefTo('#/kata/sq5/4')}`);
    await expect(k4).toHaveAttribute('aria-label', 'Kata 4');
    await expect(k4.locator('.kata-mark')).not.toHaveClass(/\bon\b/);
    await expect(page.locator('.lv-node.locked[aria-label="Kata 5, locked"]')).toBeVisible();
    await expect(page.locator('#view .lv-node.done')).toHaveCount(3);
    // No star count and no Medals on a Kata map
    await expect(page.locator('#view')).not.toContainText('★');
    await expect(page.locator('#view .medal')).toHaveCount(0);
    await expect(page.locator('#view .mq-small').first()).not.toHaveText(STAR_COUNT);
    // Another Trick counts only its own Katas
    await open(page, '#/katas/by11');
    await expect(page.locator('#view .mq-small').first()).toContainText('0 of 50 done');
    await expect(page.locator('#view .lv-node.done')).toHaveCount(0);
  });
});
