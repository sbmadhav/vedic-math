import { test, expect } from '../fixtures';

/* landing-pages, Requirements "The landing page" (scenario Page order) and "Learning is the top-level word"
   (scenario Landing labels), as changed by landing-modes-and-return. */
test.use({ seedMode: null });

test('Page order: hero, Pick how you learn, What you learn, Where the tricks come from, For grown-ups', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main :is(h1, h2)')).toHaveText(['Math tricks you can do in your head', 'Pick how you learn', 'What you learn', 'Where the tricks come from', 'For grown-ups']);
});

test('Landing labels: Start learning, Pick how you learn, and Learn in the header and footer', async ({ page }) => {
  await page.goto('/?home');
  await expect(page.locator('main a.lv-play')).toHaveText('Start learning');
  await expect(page.locator('#lv-modes-h')).toHaveText('Pick how you learn');
  await expect(page.locator('body > header a[href="/play/"]')).toHaveText('Learn');
  await expect(page.locator('footer a[href="/play/"]')).toHaveText('Learn');
});
