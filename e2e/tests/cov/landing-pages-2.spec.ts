import { test, expect } from '../fixtures';

/* landing-pages, Requirement "The Mode cards respond like buttons" (openspec change landing-modes-and-return):
   one test per scenario. */
test.use({ seedMode: null });

test('Keyboard: the Pro card shows the focus ring and Enter opens the Pro Home', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('link', { name: 'Start as Pro' });
  await card.focus();
  await expect(card).toBeFocused();
  expect(await card.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
});

test('A phone: at 375 px the cards sit in one column, each at least 44 px tall, and nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const boxes = await page.locator('a.lv-mode').evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
  expect(boxes).toHaveLength(3);
  for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(44);
  expect(new Set(boxes.map(b => Math.round(b.x))).size).toBe(1);
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
