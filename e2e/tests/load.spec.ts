import { test, expect, APP, open, openExplore } from './fixtures';

/* First load, page metadata, and the shared files that come from the rest of sbmadhav.com. */

test.describe('first visit', () => {
  test.use({ seedMode: null });

  test('loads with no console errors or failed requests, and shows the mode picker', async ({ page, issues }) => {
    await page.goto(APP);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await page.waitForLoadState('networkidle');
    expect(issues.console, 'console errors').toEqual([]);
    expect(issues.failed, 'failed requests').toEqual([]);
  });

  test('title, description, language and app metadata are present', async ({ page }) => {
    await page.goto(APP);
    await expect(page).toHaveTitle('Vedic Math for Everyone · Madhav');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Vedic Math for Everyone/);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/assets/icons/apple-touch-icon.png');
    await expect(page.locator('a.skip[href="#view"]')).toHaveCount(1);
    await expect(page.locator('nav.mq-nav')).toBeVisible();
  });
});

test('a returning player loads home with no console errors or failed requests', async ({ page, issues }) => {
  await open(page);
  await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
  await page.waitForLoadState('networkidle');
  expect(issues.console, 'console errors').toEqual([]);
  expect(issues.failed, 'failed requests').toEqual([]);
});

test.describe('shared files from the main site', () => {
  test('design system CSS loads and applies', async ({ page }) => {
    const css: Record<string, number> = {};
    page.on('response', r => { const p = new URL(r.url()).pathname; if (p.startsWith('/design-system/')) css[p] = r.status(); });
    await open(page);
    expect(css['/design-system/tokens.css']).toBe(200);
    expect(css['/design-system/components.css']).toBe(200);
    // Tokens are defined, and components.css styles the shared button class
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return ['--coral', '--teal', '--sun', '--sky', '--plum', '--bg', '--ink', '--on-accent'].map(v => [v, s.getPropertyValue(v).trim()]);
    });
    for (const [name, value] of tokens) expect(value, `${name} is defined by tokens.css`).not.toBe('');
    const radius = await page.locator('.md-btn').first().evaluate(e => getComputedStyle(e).borderRadius);
    expect(radius).not.toBe('0px');
  });

  test('self-hosted fonts load from /assets/fonts/', async ({ page, request }) => {
    await open(page);
    const faces = await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([document.fonts.load('600 20px Fredoka'), document.fonts.load('700 20px Fredoka'), document.fonts.load('400 16px "Nunito Sans"'), document.fonts.load('400 16px "Space Grotesk"'), document.fonts.load('500 16px "JetBrains Mono"')]);
      return [...document.fonts].map(f => `${f.family.replace(/"/g, '')} ${f.weight} ${f.status}`);
    });
    for (const fam of ['Fredoka 600', 'Fredoka 700', 'Nunito Sans', 'Space Grotesk', 'JetBrains Mono'])
      expect(faces.find(f => f.startsWith(fam)), `${fam}: ${faces.join(', ')}`).toMatch(/loaded$/);
    const urls = await page.evaluate(() => [...document.querySelectorAll('style')].flatMap(s => [...s.textContent!.matchAll(/url\((\/assets\/fonts\/[^)]+\.woff2)\)/g)].map(m => m[1])));
    expect(urls.length).toBe(5);
    for (const u of urls) {
      const r = await request.get(u);
      expect(r.status(), u).toBe(200);
    }
  });

  test('the web app manifest and touch icon are served', async ({ request }) => {
    const m = await request.get('/manifest.webmanifest');
    expect(m.status()).toBe(200);
    const json = await m.json();
    expect(json.name || json.short_name).toBeTruthy();
    expect(Array.isArray(json.icons) && json.icons.length).toBeTruthy();
    expect((await request.get('/assets/icons/apple-touch-icon.png')).status()).toBe(200);
  });

  test('Explore menu opens, marks Vedic Math as "You are here", and links its repo', async ({ page }) => {
    await open(page);
    const dlg = await openExplore(page);
    const here = dlg.locator('a.xp-page[aria-current="page"]');
    await expect(here).toHaveCount(1);
    await expect(here).toHaveAttribute('href', '/vedic-math/');
    await expect(here).toContainText(/Vedic Math/);
    const badge = await here.evaluate(e => getComputedStyle(e, '::after').content);
    expect(badge).toContain('You are here');
    const repo = here.locator('xpath=..').locator('a.xp-repo');
    await expect(repo).toHaveAttribute('href', 'https://github.com/sbmadhav/vedic-math');
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
  });
});

test.describe('color schemes', () => {
  const bg = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('Daybreak and Deep Space switch the palette and are remembered', async ({ page }) => {
    await open(page);
    const sw = page.locator('.md-modes');
    await sw.getByRole('button', { name: 'Deep Space' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(sw.getByRole('button', { name: 'Deep Space' })).toHaveAttribute('aria-pressed', 'true');
    const dark = await bg(page);
    await sw.getByRole('button', { name: 'Daybreak' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const light = await bg(page);
    expect(dark).not.toBe(light);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.md-modes').getByRole('button', { name: 'Daybreak' })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  });

  test('System follows the operating system scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    await expect(page.locator('.md-modes').getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
    const darkSys = await bg(page);
    await page.emulateMedia({ colorScheme: 'light' });
    const lightSys = await bg(page);
    expect(darkSys).not.toBe(lightSys);
    // An explicit choice overrides the system, and System clears it again
    await page.locator('.md-modes').getByRole('button', { name: 'Deep Space' }).click();
    expect(await bg(page)).toBe(darkSys);
    await page.locator('.md-modes').getByRole('button', { name: 'System' }).click();
    expect(await bg(page)).toBe(lightSys);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('');
  });
});
