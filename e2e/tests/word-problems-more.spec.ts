import { test, expect, open } from './fixtures';
import { box, label, onlyChoice, skip } from './word-kit';

/* Only Word problems (openspec change word-problems-more) beyond the coverage specs: the Endless run without the
   choice, and the Pro style on a level's Only page. */

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
