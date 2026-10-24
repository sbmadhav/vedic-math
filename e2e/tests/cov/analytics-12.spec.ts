import { test, expect, APP, open } from '../fixtures';
import { UA, RETURNING, offerInstall } from '../install-helpers';

/* analytics spec, Requirement "Install counts" (openspec change install-app): one test per scenario. The shared
   analytics.js is replaced by a stub that records window.siteTrack calls, so nothing is counted. */
const STUB = `window.__all = window.__all || []; window.siteTrack = (path, title) => { window.__all.push([path, title]); };`;
type Page = import('@playwright/test').Page;
const all = (page: Page): Promise<[string, string][]> => page.evaluate(() => ((globalThis as unknown as { __all?: [string, string][] }).__all || []).filter(([p]) => p.startsWith('math/install/')));
const paths = async (page: Page) => (await all(page)).map(([p]) => p);

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('Chrome on Android, a returning Player', () => {
  test.use({ seedProgress: RETURNING, userAgent: UA.androidChrome });

  test('From the nudge to the app: nudge_shown and prompt_accepted once each, then installed', async ({ page }) => {
    await open(page);
    await offerInstall(page, 'accepted');
    await page.locator('#installSlot [data-in="go"]').click();
    await expect.poll(() => paths(page)).toEqual(['math/install/nudge_shown', 'math/install/prompt_accepted']);
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect.poll(() => paths(page)).toEqual(['math/install/nudge_shown', 'math/install/prompt_accepted', 'math/install/installed']);
  });

  test('Event contents: math/install/ and a fixed word, titled "Vedic Math: install"', async ({ page }) => {
    await open(page);
    await offerInstall(page, 'dismissed');
    await page.locator('#installSlot [data-in="go"]').click();
    await expect(page.locator('#installSlot [data-in="go"]')).toHaveText('Show me how');
    await page.locator('#installSlot [data-in="later"]').click();
    await page.goto(`${APP}#/me`);
    await page.locator('#meInstall').click();
    await page.keyboard.press('Escape');
    await page.locator('#installLink').click();
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect.poll(() => paths(page)).toEqual(['math/install/nudge_shown', 'math/install/prompt_dismissed', 'math/install/nudge_later',
      'math/install/wizard_open/me', 'math/install/wizard_open/footer', 'math/install/installed']);
    for (const [p, t] of await all(page)) {
      expect(p).toMatch(/^math\/install\/(nudge_shown|nudge_later|wizard_open\/(home|me|footer|guide)|prompt_accepted|prompt_dismissed|installed|opened)$/);
      expect(t).toBe('Vedic Math: install');
    }
  });
});

test('The guide from the Me page: exactly math/install/wizard_open/me', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#meInstall').click();
  await expect(page.locator('dialog#installGuide')).toBeVisible();
  await expect.poll(() => paths(page)).toEqual(['math/install/wizard_open/me']);
});
