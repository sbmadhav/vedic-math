import AxeBuilder from '@axe-core/playwright';
import { test, expect, open, chromiumOnly } from '../fixtures';

/* site-header spec, Requirements "Small screens" and "Tabs appear after a Mode is picked": one test per scenario. */

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme, viewport: { width: 320, height: 740 } });
    test(`A 320px phone: controls on the first row, nav below, nothing sideways, every tab on screen, chip with avatar and bar (${scheme})`, async ({ page }) => {
      await open(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      const row = await Promise.all(['.md-brand', '#themeBtn', '#vmMBtn', '#mqChip a'].map(async sel => ({ sel, b: (await page.locator(sel).boundingBox())! })));
      const first = row[0].b;
      for (const { sel, b } of row) {
        expect(b.x, sel).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, sel).toBeLessThanOrEqual(320);
        expect(Math.abs(b.y + b.height / 2 - (first.y + first.height / 2)), sel).toBeLessThanOrEqual(first.height);
      }
      const nav = (await page.locator('header .mq-nav').boundingBox())!, theme = (await page.locator('#themeBtn').boundingBox())!;
      expect(nav.y).toBeGreaterThanOrEqual(theme.y + theme.height);
      const tabs = page.locator('header .mq-nav a:visible');
      expect(await tabs.count()).toBe(5); /* Home, Learn, Arcade, Watch, Find (openspec change play-nav-by-mode) */
      for (const tab of await tabs.all()) {
        const b = (await tab.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(320);
      }
      expect(await page.locator('header .mq-nav').evaluate(n => n.scrollWidth <= n.clientWidth)).toBe(true);
      await expect(page.locator('#mqChip .mq-chip .av')).toBeVisible();
      await expect(page.locator('#mqChip .mq-sparkbar')).toBeVisible();
    });
  });
}

for (const scheme of ['light', 'dark'] as const) {
  for (const width of [1280, 320]) {
    test.describe(`${scheme} scheme, header at ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: 800 } });
      test('Accessible header: axe finds no serious or critical violation with the Calm and sound panel closed and open', async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, '#/learn');
        const check = async () => {
          const res = await new AxeBuilder({ page }).include('body > header').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
          return res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
        };
        expect(await check()).toEqual([]);
        await page.locator('#vmMBtn').click();
        await expect(page.locator('#vmMPanel')).toBeVisible();
        expect(await check()).toEqual([]);
      });
    });
  }
}

test.describe('no Mode yet', () => {
  test.use({ seedMode: null });
  test('First visit: the mode picker shows and no Vedic Math tabs are visible', async ({ page }) => {
    await open(page, '#/');
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await expect(page.locator('.mq-nav')).toBeHidden();
  });
  test('After picking: Challenger brings the tabs, and Learn opens the Learn page', async ({ page }) => {
    await open(page, '#/');
    await page.locator('.mode-card[data-mode="challenger"]').click();
    const nav = page.locator('.mq-nav');
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Learn', exact: true }).click();
    await expect(page).toHaveURL(/#\/learn$/);
    await expect(page.locator('#view h1')).toHaveText('Pick a level');
  });
  test('Find without a Mode: #/find shows the Find page, not the mode picker', async ({ page }) => {
    await open(page, '#/find');
    await expect(page.locator('#findIn')).toBeVisible();
    await expect(page.locator('.mode-pick')).toHaveCount(0);
    await expect(page.locator('.mq-nav')).toBeHidden();
  });
});
