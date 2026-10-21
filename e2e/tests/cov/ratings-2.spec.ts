import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* ratings spec, "Starting Rating by Mode":
   - First Arena Practice round as Pro: covered by arena.spec.ts ('a new Pro Player starts Practice at difficulty 9').
   - Existing Player on a Skill they already practiced: WHEN a Pro Player whose mastery level on a Skill is 1 practices
     it for the first time after this change THEN their questions on that Skill are still generated at level 1.
     (A new Pro Player starts at Rating 9, which is level 2, so level 1 here comes only from the mastery fallback.) */

const progress = (page: Page) => page.evaluate(async () => (await e2eMod('store')).load());
const blank = { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, medals: {}, katasDone: {}, ratings: {}, weekSparks: {}, questDay: null };

test.describe('Existing Pro Player with mastery level 1 on a Skill and no Skill Rating', () => {
  // 5 answers practiced before Skill Ratings, mastery 0.2: level 1. No 'skill:3-mult' Rating saved yet.
  test.use({ seedMode: 'pro', seedProgress: { ...blank, skills: { '3-mult': { n: 5, c: 1, m: 0.2, streak: 0, last: 1 } } } });

  test('their first Practice questions on that Skill are generated at level 1', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    const before = await progress(page);
    expect(before.ratings['skill:3-mult']).toBeUndefined();
    expect(before.skills['3-mult'].m).toBe(0.2);
    const box = page.locator('#practice'), q = box.locator('#prQ');
    await expect(q).toHaveAttribute('data-level', '1');
    // The next questions too: two right answers move the Rating from 4 to 7, still inside level 1's band (1 to 7)
    for (let i = 0; i < 2; i++) {
      const [a, b] = ((await q.textContent()) || '').match(/\d+/g)!.map(Number);
      await box.locator('.ans-in').fill(String(a * b));
      await box.locator('#prCheck').click();
      await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
      await expect(box.locator('#prCheck')).toHaveText('Next');
      await box.locator('#prCheck').click();
      await expect(box.locator('#prCheck')).toHaveText('Check');
      await expect(q).toHaveAttribute('data-level', '1');
    }
  });
});

test.describe('control: a new Pro Player on the same Skill', () => {
  test.use({ seedMode: 'pro' });

  test('starts at Rating 9, which generates level 2 questions', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    await expect(page.locator('#practice #prQ')).toHaveAttribute('data-level', '2');
  });
});
