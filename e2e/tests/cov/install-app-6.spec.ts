import { test, expect, open } from '../fixtures';
import { offerInstall } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "One tap where the browser offers it": one test per
   scenario. The browser's offer is a synthetic beforeinstallprompt event. */
const guide = (page: import('@playwright/test').Page) => page.locator('dialog#installGuide');

test('Install now: it had focus, the browser\'s install dialog is shown, Install now goes, and the guide says the app is being installed', async ({ page }) => {
  await open(page, '#/me');
  await offerInstall(page, 'accepted');
  await page.locator('#meInstall').click();
  const now = guide(page).locator('[data-in="prompt"]');
  await expect(now).toBeFocused();
  await expect(guide(page).locator('.in-steps')).toBeVisible();
  await now.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted?: number }).__prompted)).toBe(1);
  await expect(now).toHaveCount(0);
  await expect(guide(page).locator('#inStatus')).toContainText('Installing');
  await expect(guide(page).locator('.in-steps')).toBeVisible();
});
