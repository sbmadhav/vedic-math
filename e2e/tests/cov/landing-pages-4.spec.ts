import { test, expect, APP } from '../fixtures';

/* landing-pages, Requirement "Welcome back" (openspec change landing-modes-and-return): one test per scenario. */
test('The welcome back hero: the brand link from the game greets Swift Tiger 42, and Keep playing opens /learn/', async ({ page }) => {
  await page.goto(APP);
  await page.locator('body > header .md-brand').click();
  await expect(page).toHaveURL(/\/\?home$/);
  await expect(page.locator('main h1')).toHaveText('Welcome back, Swift Tiger 42');
  await expect(page.locator('.lv-hero-t .lv-sub')).toHaveText('Pick up where you left off.');
  const go = page.locator('main a.lv-play');
  await expect(go).toHaveText('Keep playing');
  await go.click();
  await expect(page).toHaveURL(/\/learn\/$/);
});
