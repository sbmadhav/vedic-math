import { test, expect, open } from '../fixtures';
import { READY, starTag, starStory, sq5Answer, enter } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Help after a missed Word problem in a Star". */

test.use({ seedMode: 'challenger', seedProgress: READY });

test('A missed Word problem in a Star: the replay starts with what the story asks, and the rematch is a Word problem', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  for (let i = 1; i <= 2; i++) { await expect(starTag(page)).toHaveText(`Question ${i} of 4`); await enter(page, await sq5Answer(page)); await expect(page.locator('#stSay')).toContainText('+10 Sparks'); }
  await expect(starTag(page)).toHaveText('Question 3 of 4');
  await expect(starStory(page)).toBeVisible();
  await enter(page, '1');
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(page.locator('.star-step').first()).toContainText('What is it asking? The area of the garden');
  await page.keyboard.press('Escape');
  await expect(starTag(page)).toHaveText('Rematch');
  await expect(starStory(page)).toHaveText('Word problem');
  await expect(page.locator('#stQ')).toContainText('A square garden');
});
