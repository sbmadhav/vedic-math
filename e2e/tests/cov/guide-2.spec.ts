import { test, expect, APP, open } from '../fixtures';

/* guide spec, Requirements "Guide wording follows the Mode", "Opening the guide at a section" and "The guide is easy
   to find" (as modified by openspec change play-nav-by-mode): one test per scenario. */

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer: the sections use the Explorer wording and there is no Stars or Sky section', async ({ page }) => {
    await open(page, '#/guide');
    await expect(page.locator('#view h1')).toHaveText('How to play');
    await expect(page.locator('#gdh-around')).toHaveText('Find your way');
    await expect(page.locator('#gd-stars, #gd-sky')).toHaveCount(0);
  });

  test('Explorer: More places on Home has How to play, which opens the guide', async ({ page }) => {
    await open(page);
    const link = page.locator('.home-places a[href="#/guide"]');
    await expect(link).toHaveText('How to play');
    await link.click();
    await expect(page.locator('#view h1')).toHaveText('How to play');
  });
});

/* "The guide is easy to find" as modified by openspec change play-nav-by-mode: Find is the menu's help */
test('Menu bar: on the guide the Find trigger is current, and Find\'s help card links to the guide', async ({ page }) => {
  await open(page, '#/guide');
  await expect(page.locator('.mq-nav .nav-find')).toHaveAttribute('aria-current', 'true');
  await page.locator('.mq-nav .nav-find').click();
  await page.locator('.find-help a[href="#/guide"]').click();
  await expect(page.locator('#view h1')).toHaveText('How to use Vedic Math');
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
