import { test, expect, APP } from '../fixtures';

/* hosting, Requirement "Returning Players go straight into the game" (as changed by landing-modes-and-return):
   one test per scenario. */
test('A returning Player: / opens /play/ and the landing page is not shown', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/play\/$/);
});

test('The brand link from the game: the landing page opens and stays, in its welcome back version', async ({ page }) => {
  await page.goto(APP);
  await page.locator('body > header .md-brand').click();
  await expect(page).toHaveURL(/\/\?home$/);
  await expect(page.locator('body')).toHaveAttribute('data-visit', 'back');
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/\?home$/);
});

test.describe('a first visit', () => {
  test.use({ seedMode: null, tourSeen: false });
  test('A first visit: / shows the first-visit version and localStorage is unchanged', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main h1')).toHaveText('Math tricks you can do in your head');
    await expect(page.locator('body')).not.toHaveAttribute('data-visit', 'back');
    expect((await page.evaluate(() => Object.keys(localStorage))).filter(k => k !== 'vm.sound')).toEqual([]);
  });
});
