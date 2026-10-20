import { test, expect, open } from '../fixtures';

/* site-header spec, Requirement "Small screens", Scenario "A 390px phone" (openspec change find-and-home-polish). */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    test(`A 390px phone: the header is at most 132px tall, the brand mark and every control on one row, every link on screen, links at least 24px tall (${scheme})`, async ({ page }) => {
      await open(page);
      const h = (await page.locator('body > header.md-header').boundingBox())!;
      expect(h.height).toBeLessThanOrEqual(132);
      await expect(page.locator('body > header .md-brand-t')).toBeHidden();
      const brand = (await page.locator('.md-brand').boundingBox())!, row = brand.y + brand.height / 2;
      for (const sel of ['.md-brand', '#themeBtn', '#vmMBtn', '#mqChip a']) {
        const b = (await page.locator(sel).boundingBox())!;
        expect(b.x >= 0 && b.x + b.width <= 390, sel).toBe(true);
        expect(Math.abs(b.y + b.height / 2 - row), sel).toBeLessThanOrEqual(4);
      }
      for (const tab of await page.locator('header .mq-nav a:visible').all()) {
        const b = (await tab.boundingBox())!;
        expect(b.height).toBeGreaterThanOrEqual(24);
        expect(b.x >= 0 && b.x + b.width <= 390 && b.y + b.height <= h.y + h.height, await tab.innerText()).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
  });
}
