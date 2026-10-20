import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* ratings spec, "Ratings move with answers":
   - Short round: WHEN a Player answers 3 questions and leaves THEN their Rating is unchanged.
     Checked for a Skill Practice session (leaving the Skill) and for a game round (Finish after 3 answers).
   - Good Practice session: WHEN a Player answers 10 Practice questions on one Skill with only one miss
     THEN that Skill's Rating is higher afterwards.
   (practice.spec.ts covers 10 right answers with no miss; here the session includes one miss.) */

const ratings = (page: Page) => page.evaluate(async () => ((await e2eMod('store')).load().ratings || {}) as Record<string, number>);

/** Answers the times-table question on screen (right, or one too many) and waits for the feedback. */
async function answerTimes(page: Page, ok: boolean) {
  const box = page.locator('#practice');
  const [a, b] = ((await box.locator('#prQ').textContent()) || '').match(/\d+/g)!.map(Number);
  await box.locator('.ans-in').fill(String(ok ? a * b : a * b + 1));
  await box.locator('#prCheck').click();
}
/** One Practice question: right on the first try, or a miss (three wrong tries, then the steps are shown). */
async function practiceOne(page: Page, ok: boolean) {
  const box = page.locator('#practice'), say = box.locator('#prSay');
  if (ok) {
    await answerTimes(page, true);
    await expect(say).toHaveClass(/\bok\b/);
  } else {
    for (let k = 0; k < 3; k++) {
      await answerTimes(page, false);
      await expect(say).toHaveClass(/\bno\b/);
    }
    await expect(box.locator('#prSol')).toBeVisible();
  }
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
}

test.describe('Short round', () => {
  test.use({ seedMode: 'challenger', seedProgress: { ratings: { 'skill:3-mult': 6, 'game:times-sprint': 5 } } });

  test('3 right Practice answers on a Skill, then leaving: the Skill Rating is unchanged', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    for (let i = 0; i < 3; i++) await practiceOne(page, true);
    await expect(page.locator('#practice .pr-score')).toHaveText('3/3');
    await open(page, '#/learn'); // leave: the session ends (and would save a Rating with 4 or more answers)
    expect((await ratings(page))['skill:3-mult']).toBe(6);
    // Coming back still starts at the old Rating (6 is level 1)
    await open(page, '#/skill/3-mult');
    await expect(page.locator('#practice #prQ')).toHaveAttribute('data-level', '1');
    expect((await ratings(page))['skill:3-mult']).toBe(6);
  });

  test('3 wrong Practice answers then leaving: the Skill Rating does not go down either', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    for (let i = 0; i < 3; i++) await practiceOne(page, false);
    await expect(page.locator('#practice .pr-score')).toHaveText('0/3');
    await open(page, '#/learn');
    expect((await ratings(page))['skill:3-mult']).toBe(6);
  });

  test('3 right answers in a game round, then Finish: the game Rating is unchanged', async ({ page }) => {
    await open(page, '#/game/times-sprint');
    await expect(page.locator('#gShell .dial')).toHaveAttribute('aria-label', 'Difficulty 5 of 20');
    await page.locator('#gShell [data-m="endless"]').click();
    await page.locator('#gStart').click();
    const area = page.locator('#gArea'), q = area.locator('.g-q'), inp = area.locator('.ans-in');
    for (let i = 1; i <= 3; i++) {
      const [x, y] = (await q.textContent())!.replace(/,/g, '').split('×').map(s => Number(s.trim()));
      await inp.fill(String(x * y));
      await inp.press('Enter');
      await expect(page.locator('#gSay')).toHaveText(`Right! ${i} so far.`);
    }
    await page.locator('#gQuit').click(); // Finish: the round ends
    const result = page.locator('.g-result');
    await expect(result).toContainText('3 of 3 right.');
    await expect(result).not.toContainText('Your skill rose');
    await expect(result).not.toContainText('Your skill is now');
    expect((await ratings(page))['game:times-sprint']).toBe(5);
    await expect(page.locator('#gShell .dial')).toHaveAttribute('aria-label', 'Difficulty 5 of 20');
  });
});

test.describe('Good Practice session', () => {
  test.use({ seedMode: 'challenger', seedProgress: { ratings: { 'skill:3-mult': 5 } } });

  for (const missAt of [0, 4, 9]) {
    test(`10 Practice answers on one Skill with one miss (answer ${missAt + 1}) raise that Skill's Rating`, async ({ page }) => {
      await open(page, '#/skill/3-mult');
      expect((await ratings(page))['skill:3-mult']).toBe(5);
      for (let i = 0; i < 10; i++) await practiceOne(page, i !== missAt);
      await expect(page.locator('#practice .pr-score')).toHaveText('9/10');
      await open(page, '#/learn'); // afterwards
      const after = await ratings(page);
      expect(after['skill:3-mult']).toBeGreaterThan(5);
      expect(Object.keys(after).sort()).toEqual(['skill:3-mult']); // only that Skill's Rating moved
    });
  }
});
