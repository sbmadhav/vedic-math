import { test, expect, open } from '../fixtures';

/* site-header spec, Requirement "The menu follows the Mode" (openspec change play-nav-by-mode, which replaces the menu
   list of "Sutras come first in the menu" from openspec change sutras-first: the Sutras now lead Learn): one test per
   scenario. */
const tabs = async (page: import('@playwright/test').Page) => (await page.locator('header .mq-nav a:visible').allInnerTexts()).map(t => t.trim().split('\n')[0].trim());

test('Challenger menu: Home, Learn, Arcade, Watch and Find, and Find shows its shortcut on a wide screen', async ({ page }, testInfo) => {
  await open(page, '#/');
  expect(await tabs(page)).toEqual(['Home', 'Learn', 'Arcade', 'Watch', 'Find']);
  if (testInfo.project.name !== 'mobile') await expect(page.locator('header .nav-find .nav-kbd')).toBeVisible();
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer menu: exactly three tabs, Play, Learn and Me, each with a picture and its name, each at least 56px tall', async ({ page }) => {
    await open(page, '#/');
    expect(await tabs(page)).toEqual(['Play', 'Learn', 'Me']);
    for (const a of await page.locator('header .mq-nav a').all()) {
      await expect(a.locator('svg')).toHaveCount(1);
      expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    }
  });
});

test('Switching Mode on Me: picking Explorer shows Play, Learn and Me without a reload', async ({ page }) => {
  await open(page, '#/me');
  await page.evaluate(() => { (window as any).__sameDoc = true; });
  await page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]').click();
  expect(await tabs(page)).toEqual(['Play', 'Learn', 'Me']);
  expect(await page.evaluate(() => (window as any).__sameDoc)).toBe(true);
});
