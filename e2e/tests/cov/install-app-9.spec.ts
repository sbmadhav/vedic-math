import { test, expect, APP, open } from '../fixtures';
import { UA, RETURNING, offerInstall, asInstalledApp, recordEvents, events } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "Nothing to install in the Installed app": one test per
   scenario. The Installed app is an init script (display-mode or navigator.standalone). */
const nudge = (page: import('@playwright/test').Page) => page.locator('#installSlot .in-nudge');

test.use({ seedProgress: RETURNING, userAgent: UA.androidChrome });

test('Standalone: no nudge, no install in the footer, the Me page or the Guide, and math/install/opened is sent', async ({ page }) => {
  await recordEvents(page);
  await asInstalledApp(page);
  await open(page);
  await offerInstall(page);
  await page.waitForTimeout(800);
  await expect(nudge(page)).toHaveCount(0);
  await expect(page.locator('#installWrap')).toBeHidden();
  await page.goto(`${APP}#/me`);
  await expect(page.locator('#meInstall')).toHaveCount(0);
  await page.goto(`${APP}#/guide/offline`);
  await expect(page.locator('#gd-offline [data-gd="install"]')).toHaveCount(0);
  await expect.poll(() => events(page)).toContain('math/install/opened');
});

test.describe('iPhone', () => {
  test.use({ userAgent: UA.iphoneSafari });
  test('iPhone home screen app: with navigator.standalone, no nudge and no install entry point', async ({ page }) => {
    await asInstalledApp(page, { ios: true });
    await open(page);
    await page.waitForTimeout(800);
    await expect(nudge(page)).toHaveCount(0);
    await expect(page.locator('#installWrap')).toBeHidden();
    await page.goto(`${APP}#/me`);
    await expect(page.locator('#meInstall')).toHaveCount(0);
  });
});

test('Installed from the browser: appinstalled takes the nudge away, the Me page and the footer offer no install, math/install/installed is sent', async ({ page }) => {
  await recordEvents(page);
  await open(page);
  await offerInstall(page);
  await expect(nudge(page)).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(nudge(page)).toHaveCount(0);
  await expect(page.locator('#installWrap')).toBeHidden();
  await expect.poll(() => events(page)).toContain('math/install/installed');
  await page.goto(`${APP}#/me`);
  await expect(page.locator('#meInstall')).toHaveCount(0);
});
