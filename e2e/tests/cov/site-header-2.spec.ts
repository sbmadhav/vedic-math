import { test, expect, open } from '../fixtures';

/* site-header spec, Requirements "Color scheme button", "Nav shows the current route" and "Calm and sound control"
   (as modified and renamed by openspec change play-nav-by-mode; before it "Music control in the site's style"): one
   test per scenario. */
type Page = import('@playwright/test').Page;
const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('Switch and remember: on a Daybreak system one click gives Deep Space, the moon, and theme=dark after a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  const light = await bg(page);
  await expect(page.locator('#themeBtn .md-theme-sun')).toBeVisible();
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#themeBtn .md-theme-moon')).toBeVisible();
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
  await expect(page.locator('#themeBtn .md-theme-moon')).toBeVisible();
  expect(await bg(page)).not.toBe(light);
});

test('A choice made elsewhere on the site: Deep Space saved on the landing page opens the game in Deep Space', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('theme', 'dark'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* storage blocked */ } });
  await open(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#themeBtn .md-theme-moon')).toBeVisible();
});

test('Current route: on Learn, the Arena, Games, Watch and the Guide exactly Learn, Arcade, Arcade, Watch or Find is current and filled', async ({ page }) => {
  for (const [hash, name] of [['#/learn', 'Learn'], ['#/arena', 'Arcade'], ['#/games', 'Arcade'], ['#/watch', 'Watch'], ['#/guide', 'Find']] as const) {
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

test('A Trick page: on the Trick page of squares ending in 5 the Arcade is current', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  await expect(page.locator('header .mq-nav a[aria-current="true"]')).toHaveText('Arcade');
});

test('Open the panel: Calm in the header opens the panel with the Calm switch, Pause motion and the four soundscapes, and Escape closes it', async ({ page }) => {
  await open(page);
  await page.locator('#vmMBtn').click();
  await expect(page.locator('#vmMPanel')).toBeVisible();
  await expect(page.locator('#vmMPanel #vmCalm')).toBeVisible();
  await expect(page.locator('#vmMPanel #vmMotion')).toBeVisible();
  await expect(page.locator('#vmMPanel [data-t]')).toHaveCount(4);
  await expect(page.locator('#vmMBtn')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#vmMPanel')).toBeHidden();
});

test('Calm from the header: turning Calm on in the panel shows on Me, and nothing starts playing', async ({ page }) => {
  await open(page);
  await page.locator('#vmMBtn').click();
  await page.locator('#vmCalm').click();
  await expect(page.locator('#vmMBtn')).not.toHaveClass(/\bon\b/);
  await open(page, '#/me');
  await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'true');
});

test('In a round: Pause motion from the shell\'s Calm and sound control is on for the site, and the header shows it after the round', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await page.locator('#plMBtn').click();
  await page.locator('#plMotion').click();
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
  await page.locator('#stExit').click();
  await page.locator('#vmMBtn').click();
  await expect(page.locator('#vmMotion')).toHaveAttribute('aria-checked', 'true');
});
