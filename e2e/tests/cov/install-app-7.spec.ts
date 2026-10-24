import { test, expect, open } from '../fixtures';
import { UA } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "Steps for each browser": one test per scenario. */
const guide = (page: import('@playwright/test').Page) => page.locator('dialog#installGuide');

test.describe('Safari on an iPhone', () => {
  test.use({ userAgent: UA.iphoneSafari });
  test('Safari on iPhone: Share, Add to Home Screen, Add, and the note about the home screen app\'s own progress and a backup code', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('#meInstall').click();
    const li = guide(page).locator('.in-steps li');
    await expect(li).toHaveCount(3);
    await expect(li.nth(0)).toContainText('Share');
    await expect(li.nth(1)).toContainText('Add to Home Screen');
    await expect(li.nth(2)).toContainText('Add');
    await expect(guide(page).locator('.in-note')).toContainText('keeps its own progress');
    await expect(guide(page).locator('.in-note')).toContainText('backup code');
  });
});

test.describe('Instagram', () => {
  test.use({ userAgent: UA.instagram });
  test('Inside another app: open the page in the browser first, and a Copy the link button', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('#meInstall').click();
    await expect(guide(page).locator('.in-steps li').first()).toContainText('Open in browser');
    await expect(guide(page).getByRole('button', { name: 'Copy the link' })).toBeVisible();
  });
});

test.describe('Firefox on a computer', () => {
  test.use({ userAgent: UA.firefoxDesktop });
  test('Firefox on a computer: it cannot install web apps; Chrome, Edge or Safari, or a bookmark', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('#meInstall').click();
    const steps = guide(page).locator('.in-steps');
    await expect(steps).toContainText('cannot install web apps');
    await expect(steps).toContainText('Chrome, Edge or Safari');
    await expect(steps).toContainText('bookmark');
    await expect(guide(page).locator('[data-in="prompt"]')).toHaveCount(0);
  });
});
