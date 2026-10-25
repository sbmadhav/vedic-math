import { test, expect, open } from '../fixtures';

/* install-app spec (openspec change install-app), Requirement "The guide works by keyboard, by screen reader and on a
   small phone": one test per scenario. */
const guide = (page: import('@playwright/test').Page) => page.locator('dialog#installGuide');

test('Keyboard and screen readers: focus in, a labelled list with "Step 1 of 3", Tab stays inside, Escape closes and focus goes back', async ({ page }) => {
  await open(page, '#/me');
  const btn = page.locator('#meInstall');
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(guide(page)).toBeVisible();
  const list = guide(page).locator('ol.in-steps');
  await expect(list).toBeFocused();
  await expect(list).toHaveAttribute('aria-labelledby', 'inStepsH');
  await expect(list.locator('li').first().locator('.md-sr-only')).toHaveText(/^Step 1 of [23]: $/);
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog#installGuide'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(guide(page)).toBeHidden();
  await expect(btn).toBeFocused();
});

test.describe('a 320 px phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  for (const scheme of ['light', 'dark'] as const) {
    test(`A 320 px phone: nothing scrolls sideways with the picker open (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, '#/me');
      await page.locator('#meInstall').click();
      await guide(page).locator('.in-other summary').click();
      const box = (await guide(page).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      expect(await guide(page).evaluate(d => d.scrollWidth <= d.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });
  }
});
