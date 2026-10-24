import { test, expect, open } from '../fixtures';
import { UA, RETURNING, offerInstall } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "When the nudge shows": one test per scenario (the
   scenario's four cases, each as its own test). */
const nudge = (page: import('@playwright/test').Page) => page.locator('#installSlot .in-nudge');

test.describe('a first day of play', () => {
  test.use({ userAgent: UA.androidChrome });
  test('Not yet, or not here: a Player on their first day of play gets no nudge, even with Chrome\'s offer', async ({ page }) => {
    await open(page);
    await offerInstall(page);
    await page.waitForTimeout(800);
    await expect(nudge(page)).toHaveCount(0);
  });
});

test.describe('a returning Player', () => {
  test.use({ seedProgress: RETURNING });
  for (const [name, ua] of [['Chrome on Android without its offer', UA.androidChrome], ['Chrome on an iPhone', UA.iphoneChrome], ['another app\'s web view', UA.instagram]] as const) {
    test.describe(name, () => {
      test.use({ userAgent: ua });
      test(`Not yet, or not here: ${name} shows no nudge`, async ({ page }) => {
        await open(page);
        await page.waitForTimeout(800);
        await expect(nudge(page)).toHaveCount(0);
      });
    });
  }
});
