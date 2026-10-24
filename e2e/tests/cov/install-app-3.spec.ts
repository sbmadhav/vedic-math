import { test, expect, APP, open } from '../fixtures';
import { UA } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "Tags for iPhone, iPad and the browser bar": one test per
   scenario. */

test.describe('Safari on an iPhone', () => {
  test.use({ userAgent: UA.iphoneSafari });
  test('iPhone and iPad: the Apple touch icon, the title "Vedic Math" and the full-screen meta tags', async ({ page }) => {
    await open(page);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Vedic Math');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  });
});

test('The bar follows the scheme: Deep Space, and Deep Space saved on a Daybreak device, give the Deep Space --bg; Daybreak the Daybreak --bg', async ({ page }) => {
  const meta = async () => ((await page.locator('meta[name="theme-color"]').getAttribute('content')) || '').toLowerCase();
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page);
  expect(await meta()).toBe(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase()));
  expect(await meta()).toBe('#0f1218');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.reload();
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  expect(await meta()).toBe('#0f1218');
  await page.evaluate(() => localStorage.removeItem('theme'));
  await page.reload();
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  expect(await meta()).toBe('#f6f7f9');
  // From before the first paint: the tag comes before the pre-paint script, which sets it
  const html = await (await page.request.get(APP)).text();
  expect(html.indexOf('name="theme-color"')).toBeLessThan(html.indexOf("localStorage.getItem('theme')"));
});
