import { test, expect } from '../fixtures';

/* landing-pages, Requirement "Welcome back only reads" (openspec change landing-modes-and-return):
   one test per scenario. */
test('Nothing written or sent: storage is unchanged and no request carries the Nickname', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', r => urls.push(r.url() + ' ' + (r.postData() || '')));
  await page.goto('/?home');
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  await expect(page.locator('main h1')).toHaveText('Welcome back, Swift Tiger 42');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
  expect(urls.filter(u => /swift|tiger/i.test(decodeURIComponent(u)))).toEqual([]);
});

test.describe('JavaScript off', () => {
  test.use({ javaScriptEnabled: false });
  test('Storage blocked (JavaScript off): the first-visit version is shown', async ({ page }) => {
    await page.goto('/?home');
    await expect(page.locator('main h1')).toHaveText('Math tricks you can do in your head');
    await expect(page.locator('main a.lv-play')).toHaveText('Start learning');
    await expect(page.locator('.lv-mode-cta')).toHaveText(['Start as Explorer', 'Start as Challenger', 'Start as Pro']);
  });
});

test('Storage blocked: the first-visit version is shown', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await page.goto('/?home');
  await expect(page.locator('main h1')).toHaveText('Math tricks you can do in your head');
  await expect(page.locator('main a.lv-play')).toHaveText('Start learning');
  await expect(page.locator('.lv-mode-cta')).toHaveText(['Start as Explorer', 'Start as Challenger', 'Start as Pro']);
});
