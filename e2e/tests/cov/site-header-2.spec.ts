import { test, expect, open } from '../fixtures';

/* site-header spec, Requirements "Color scheme button", "Nav shows the current route" and "Music control in the site's
   style": one test per scenario. */
type Page = import('@playwright/test').Page;
const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('Switch and remember: on a Daybreak system one click gives Deep Space, the moon, and theme=dark after a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  const light = await bg(page);
  await expect(page.locator('#themeBtn .sun')).toBeVisible();
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#themeBtn .moon')).toBeVisible();
  expect(await bg(page)).not.toBe(light);
});

test('Back to the system: a second click returns to Daybreak, saves no scheme and follows the system again', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  const light = await bg(page);
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
  expect(await page.evaluate(() => localStorage.getItem('theme') || '')).toBe('');
  expect(await bg(page)).toBe(light);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('#themeBtn .moon')).toBeVisible();
  expect(await bg(page)).not.toBe(light);
});

test('A choice made elsewhere on the site: Deep Space saved by the home page opens Vedic Math in Deep Space', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('theme', 'dark'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* storage blocked */ } });
  await open(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#themeBtn .moon')).toBeVisible();
});

test('Current route: on Learn, Arena, Games, Watch and Guide exactly that nav link is current and filled', async ({ page }) => {
  for (const [hash, name] of [['#/learn', 'Learn'], ['#/arena', 'Arena'], ['#/games', 'Games'], ['#/watch', 'Watch'], ['#/guide', 'Guide']] as const) {
    await open(page, hash);
    const nav = page.locator('header .mq-nav');
    await expect(nav.locator('a[aria-current="true"]')).toHaveCount(1);
    const cur = nav.getByRole('link', { name, exact: true });
    await expect(cur).toHaveAttribute('aria-current', 'true');
    const fill = await cur.evaluate(e => getComputedStyle(e).backgroundColor);
    const other = await nav.locator('a[aria-current="false"]').first().evaluate(e => getComputedStyle(e).backgroundColor);
    expect(fill, name).not.toBe(other);
  }
});

test('Open the panel: Music in the header opens the music panel and Escape closes it', async ({ page }) => {
  await open(page);
  await page.locator('#vmMBtn').click();
  await expect(page.locator('#vmMPanel')).toBeVisible();
  await expect(page.locator('#vmMBtn')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#vmMPanel')).toBeHidden();
});
