import { test, expect, APP, open, atRoute } from '../fixtures';

/* guide spec, Requirement "A first-visit tour": one test per scenario. The tour runs on a device that has never shown
   it (tourSeen: false) for a Player who has just picked a Mode. */
type Page = import('@playwright/test').Page;
const tour = (page: Page) => page.locator('dialog.vm-tour');
const tourState = (page: Page) => page.evaluate(() => localStorage.getItem('vm.tour'));

test.describe('a new Player on a fresh device', () => {
  test.use({ tourSeen: false, seedMode: null });

  test('First visit: picking Challenger opens Home with the tour on the Player strip and a step count', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    const dlg = tour(page);
    await expect(dlg).toBeVisible();
    await expect(dlg).toHaveAttribute('data-step', 'me');
    await expect(dlg.locator('#tourT')).toHaveText('This is you');
    await expect(dlg.locator('#tourN')).toHaveText(/^1 of [3-6]$/);
    await expect(page.locator('.me-strip')).toBeVisible();
  });

  test('Shown once: after a skip the tour does not come back on Home or after a reload', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    await expect(tour(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tour(page)).toHaveCount(0);
    expect(await tourState(page)).toBe('skipped');
    await page.goto(`${APP}#/learn`); await page.goto(`${APP}#/`);
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);
  });
});

test.describe('a Player with Sparks', () => {
  test.use({ tourSeen: false, seedProgress: { v: 3, skills: {}, sparks: 120 } });

  test('A returning Player: Sparks already earned means no tour on a fresh device', async ({ page }) => {
    await open(page);
    await expect(page.locator('.me-strip')).toBeVisible();
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);
  });

  test('Replay: Take the tour in the guide opens Home with the first step', async ({ page }) => {
    await open(page, '#/guide');
    await page.locator('.gd-top [data-gd="tour"]').click();
    await expect(page).toHaveURL(atRoute('#/'));
    await expect(tour(page)).toBeVisible();
    await expect(tour(page).locator('#tourN')).toContainText('1 of');
  });
});
