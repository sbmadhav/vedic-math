import { test, expect, open } from '../fixtures';

/* page-layout spec, Requirement "Toasts keep the primary action clear": one test per scenario (openspec change
   find-and-home-polish). A fresh Challenger earns the First step badge with the first right answer. */
type Page = import('@playwright/test').Page;
const overlap = (a: { y: number; height: number }, b: { y: number; height: number }) => a.y < b.y + b.height && b.y < a.y + a.height;

test.use({ viewport: { width: 390, height: 844 } });

test('Badge earned in a Star round: the toast does not overlap the number pad or its Check key', async ({ page }) => {
  await open(page, '#/star/from9/1');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  const q = (await page.locator('#stQ').innerText()).replace(/[−–]/g, '-').replace(/[^\d+\-*/(). ]/g, '');
  for (const ch of String(Math.round(Function(`return (${q})`)()))) await page.locator(`.star-key[data-k="${ch}"]`).click();
  await page.locator('.star-key[data-k="go"]').click();
  const toast = page.locator('.fx-toast', { hasText: 'Badge earned' }).first();
  await expect(toast).toBeVisible();
  await page.waitForTimeout(400); /* the box is placed again once the feedback has moved the page */
  const t = (await toast.boundingBox())!;
  for (const sel of ['.star-pad', '.star-key[data-k="go"]']) expect(overlap(t, (await page.locator(sel).boundingBox())!), sel).toBe(false);
});

test('Home: with no primary button near the bottom, a toast shows at the bottom as before', async ({ page }) => {
  await open(page);
  await expect(page.locator('h1.home-h')).toBeVisible();
  await page.evaluate(async () => { const fx = await e2eMod('fx'); fx.toast('<b>Quest complete</b> test', 'ok'); });
  const t = (await page.locator('.fx-toast').first().boundingBox())!;
  expect(t.y + t.height).toBeGreaterThan(844 - 120);
  const p = (await page.locator('#view .md-btn--primary').boundingBox())!;
  expect(overlap(t, p)).toBe(false);
});
