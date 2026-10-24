import { test, expect, APP, open } from '../fixtures';
import { UA, RETURNING, installState, seedInstallState } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "Not now": one test per scenario. */
const nudge = (page: import('@playwright/test').Page) => page.locator('#installSlot .in-nudge');

test.use({ seedProgress: RETURNING, userAgent: UA.iphoneSafari });

test('Not now: the nudge goes, focus is on Home\'s heading, and it stays away for 7 days, also after a reload', async ({ page }) => {
  await open(page);
  await nudge(page).getByRole('button', { name: 'Not now' }).click();
  await expect(nudge(page)).toHaveCount(0);
  await expect(page.locator('h1.home-h')).toBeFocused();
  const s = await installState(page);
  expect(Object.keys(s).sort()).toEqual(['installed', 'later', 'until']);
  expect(s.later).toBe(1);
  expect(Math.round((s.until - Date.now()) / 864e5)).toBe(7);
  await page.reload();
  await expect(page.locator('h1.home-h')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(nudge(page)).toHaveCount(0);
});

test('A week later: Not now pressed once more than 7 days ago lets the nudge show again', async ({ page }) => {
  await seedInstallState(page, { later: 1, until: Date.now() - 60_000, installed: 0 });
  await open(page);
  await expect(nudge(page)).toBeVisible();
});

test('The third time: never again, and the Me page still has How to install', async ({ page }) => {
  await seedInstallState(page, { later: 2, until: 0, installed: 0 });
  await open(page);
  await nudge(page).getByRole('button', { name: 'Not now' }).click();
  expect((await installState(page)).later).toBe(3);
  // A year later: still never
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('vm.install')!); s.until = Date.now() - 365 * 864e5; localStorage.setItem('vm.install', JSON.stringify(s)); });
  await page.reload();
  await expect(page.locator('h1.home-h')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(nudge(page)).toHaveCount(0);
  await page.goto(`${APP}#/me`);
  await expect(page.locator('#meInstall')).toBeVisible();
});
