import { test, expect, open } from '../fixtures';

/* install-app spec (openspec change install-app), Requirement "The Install guide": one test per scenario. */
const guide = (page: import('@playwright/test').Page) => page.locator('dialog#installGuide');

test('From the Me page, the footer and the Guide: the Install guide opens with the steps for this browser', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#meInstall').click();
  await expect(guide(page)).toBeVisible();
  await expect(guide(page).locator('#inStepsH')).toHaveText(/^How to install: /);
  await page.keyboard.press('Escape');
  await page.locator('#installLink').click();
  await expect(guide(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await open(page, '#/guide/offline');
  await page.locator('#gd-offline [data-gd="install"]').click();
  await expect(guide(page)).toBeVisible();
  await expect(guide(page).locator('.in-steps li').first()).toBeVisible();
  // Why, in three lines with pictures; text and pictures only, nothing read aloud
  await expect(guide(page).locator('.in-why li')).toHaveCount(3);
  await expect(guide(page).locator('[data-listen], .listen-btn, .say-btn')).toHaveCount(0);
});

test('Another device: Mac (Safari) shows File, Add to Dock; the picked button is pressed, keeps focus, and the change is announced', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#meInstall').click();
  await guide(page).locator('.in-other summary').click();
  const mac = guide(page).locator('.in-pick [data-kind="mac-safari"]');
  await mac.focus();
  await page.keyboard.press('Enter');
  await expect(mac).toHaveAttribute('aria-pressed', 'true');
  await expect(mac).toBeFocused();
  await expect(guide(page).locator('.in-steps')).toContainText('File');
  await expect(guide(page).locator('.in-steps')).toContainText('Add to Dock');
  await expect(guide(page).locator('#inStatus[role="status"]')).toHaveText('Showing the steps for Mac (Safari).');
});

test.describe('an Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer: the title is "For a grown-up: add the app"', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('#meInstall').click();
    await expect(guide(page).locator('h2#inTitle')).toHaveText('For a grown-up: add the app');
  });
});
