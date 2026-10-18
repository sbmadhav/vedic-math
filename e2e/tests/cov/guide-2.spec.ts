import { test, expect, APP, open } from '../fixtures';

/* guide spec, Requirements "Guide wording follows the Mode", "Opening the guide at a section" and "The guide is easy
   to find": one test per scenario. */

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer: the sections use the Explorer wording and there is no Stars or Sky section', async ({ page }) => {
    await open(page, '#/guide');
    await expect(page.locator('#view h1')).toHaveText('How to play');
    await expect(page.locator('#gdh-around')).toHaveText('Find your way');
    await expect(page.locator('#gd-stars, #gd-sky')).toHaveCount(0);
  });

  test('Menu bar: an Explorer sees a Guide link, marked current on the guide', async ({ page }) => {
    await open(page, '#/learn');
    const link = page.locator('.mq-nav a[href="#/guide"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('aria-current', 'false');
    await link.click();
    await expect(page.locator('#view h1')).toHaveText('How to play');
    await expect(link).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('no mode yet', () => {
  test.use({ seedMode: null });
  test('No mode yet: #/guide shows the guide, not the mode picker, with a link to pick a mode', async ({ page }) => {
    await page.goto(`${APP}#/guide`);
    await expect(page.locator('#view h1')).toHaveText('How to use Vedic Math');
    await expect(page.locator('.mode-pick')).toHaveCount(0);
    const pick = page.locator('.gd-nomode a[href="#/"]');
    await expect(pick).toBeVisible();
    await pick.click();
    await expect(page.locator('.mode-pick .mode-card').first()).toBeVisible();
  });
});

test('Linked section: #/guide/arena opens with the Arena section in view and its heading focused', async ({ page }) => {
  await open(page, '#/guide/arena');
  const h = page.locator('#gdh-arena');
  await expect(h).toBeFocused();
  await expect(h).toBeInViewport();
});
