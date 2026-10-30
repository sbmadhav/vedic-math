import { test, expect, open } from '../fixtures';
import { ON, visit } from '../family-kit';

/* star-round spec, delta of change family-helpers, Requirement "The Family wait for the round's end", Scenario "Misses
   in a Star": two misses bring no friend during the round, Bolt replays the Trick as before, and a friend visits once
   the end screen shows (here after Skip this Star). Nothing is posted: a Star is Practice. */
test.use({ seedPlayer: ON });

const tag = (page: import('@playwright/test').Page) => page.locator('#stMain .star-tag');

test('Misses in a Star: nobody during the round, Bolt replays, and a friend visits at the end screen', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await expect(tag(page)).toHaveText('Question 1 of 4');
  await page.keyboard.type('1'); await page.keyboard.press('Enter');
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(visit(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(tag(page)).toHaveText('Rematch');
  await page.keyboard.type('1'); await page.keyboard.press('Enter');
  await expect(page.locator('#stSay')).toContainText(/It is \d+/); /* the missed rematch's answer is shown */
  await expect(visit(page)).toHaveCount(0);
  await page.locator('#stSkip').click();
  await expect(page.locator('.star-end-h')).toBeVisible();
  await expect(visit(page)).toBeVisible();
  await expect(page.locator('.star-acts [data-fh-ask]')).toBeVisible();
});
