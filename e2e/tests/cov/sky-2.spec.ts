import { test, expect, open } from '../fixtures';

/* sky spec, Requirements "Star states on the Sky" and "A suggested path in Belt order": one test per scenario. */
type Page = import('@playwright/test').Page;
const star = (page: Page, k: string) => page.locator(`.sky-star[data-star="${k}"]`);

test.use({ seedPlayer: { sky: true } });

test.describe('Star 2 of sq5 skipped', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: {}, skipped: { 'sq5:2': 1 }, last: {} } } });
  test('A skipped Star: dashed outline, a skip badge and "skipped" in its name', async ({ page }) => {
    await open(page);
    const sk = star(page, 'sq5:2');
    await expect(sk).toHaveClass(/sky-star--skipped/);
    await expect(sk).toHaveAttribute('aria-label', 'Square numbers ending in 5, Star 2, skipped');
    await expect(sk.locator('.sky-skipb')).toHaveCount(1);
    expect(await sk.locator('.sky-skipring').evaluate(e => getComputedStyle(e).strokeDasharray)).not.toBe('none');
  });
});

test('Open from the start: a Player who lit nothing can start a black belt Star 3', async ({ page }) => {
  await open(page);
  await star(page, 'zero-sum:3').click();
  await expect(page).toHaveURL(/#\/star\/zero-sum\/3$/);
  await expect(page.locator('.star-top .md-tag')).toHaveText('Star 3 of 3');
});

test('New Player: with no Star progress and no Placement Bolt waits at Star 1 of the first white belt Trick', async ({ page }) => {
  await open(page);
  await expect(page.locator('.sky-bolt')).toHaveAttribute('data-at', 'from9:1');
  await expect(star(page, 'from9:1')).toHaveClass(/sky-star--next/);
});

test.describe('Star 1 lit, Star 2 skipped', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: { 'from9:1': 1 }, skipped: { 'from9:2': 1 }, last: {} } } });
  test('Skipped Stars are passed over: Bolt waits at Star 3 of the first white belt Trick', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-bolt')).toHaveAttribute('data-at', 'from9:3');
  });
});

test.describe('placed at orange', () => {
  test.use({ seedPlayer: { sky: true, placedBelt: 'orange' } });
  test('Placement: an orange belt result with nothing lit puts Bolt at Star 1 of the first orange belt Trick', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-bolt')).toHaveAttribute('data-at', 'near-base:1');
    await expect(star(page, 'near-base:1')).toHaveClass(/sky-star--next/);
  });
});
