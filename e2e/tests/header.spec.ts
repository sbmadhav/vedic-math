import { test, expect, open } from './fixtures';

/* The site header (openspec site-header, change learnvedicmath): every page, the game included, uses the Learn Vedic
   Math header from theme/header.html (design system 2.1.0's header without Explore): one sticky bar with the brand
   (linking to /?home), the page's nav, the round color scheme button, and in the game the music pill and the Player
   chip last. No Explore button and no kid mode switch. */

type Page = import('@playwright/test').Page;

/* The header's controls in order, by kind */
const kinds = (page: Page) => page.evaluate(() => {
  const wrap = document.querySelector('body > header .md-wrap')!;
  const parts = [...wrap.children].flatMap(e => e.matches('.md-header-end') ? [...e.children] : [e]);
  return parts.map(e => {
    if (e.matches('.md-brand')) return 'brand';
    if (e.matches('nav')) return 'nav';
    if (e.matches('#exploreBtn, .xp-btn')) return 'explore';
    if (e.matches('#themeBtn')) return 'theme';
    if (e.matches('#mqMusic')) return 'music';
    if (e.matches('#mqChip')) return 'player';
    return 'other:' + (e.id || e.className);
  });
});

test.describe('wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('one sticky row: brand, nav, color scheme, music, Player chip, and no Explore', async ({ page }) => {
    await open(page);
    expect(await kinds(page)).toEqual(['brand', 'nav', 'theme', 'music', 'player']);
    await expect(page.locator('#exploreBtn, .xp-btn')).toHaveCount(0);
    const header = page.locator('body > header.md-header');
    await expect(header).toHaveCSS('position', 'sticky');
    const tops = await page.evaluate(() => ['.md-brand', '.mq-nav', '#themeBtn', '#vmMBtn', '#mqChip a']
      .map(s => { const r = document.querySelector(s)!.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }));
    for (const t of tops) expect(Math.abs(t - tops[0])).toBeLessThanOrEqual(2);
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(68);
    await expect(page.locator('#vmMBtn .lbl')).toHaveText('Music');
    await expect(page.locator('#vmMBtn .lbl')).toBeVisible();
    // Stays at the top while the page scrolls
    await page.mouse.wheel(0, 1200);
    await expect.poll(() => header.evaluate(e => Math.round(e.getBoundingClientRect().top))).toBe(0);
  });

  test('the brand says Learn Vedic Math and opens the landing page, which stays', async ({ page }) => {
    await open(page);
    const brand = page.locator('body > header .md-brand');
    await expect(brand).toHaveAttribute('aria-label', 'Learn Vedic Math, home');
    await expect(brand).toHaveAttribute('href', '/?home');
    await expect(brand).toContainText('Learn Vedic Math');
    // The brand mark is the Nikhilam Family (3:2), not Bolt
    const mark = brand.locator('svg.lv-mark');
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(await mark.evaluate(e => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)])).toEqual([48, 32]);
    await brand.click();
    await expect(page).toHaveURL(/\/\?home$/);
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/\?home$/);
  });

  test('the landing page has the same header with Play and the grown-up pages, and no Explore', async ({ page }) => {
    await page.goto('/?home');
    expect(await kinds(page)).toEqual(['brand', 'nav', 'theme']);
    const nav = page.locator('body > header nav');
    for (const [name, href] of [['Play', '/play/'], ['For parents', '/parents/'], ['For teachers', '/teachers/']])
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    await expect(page.locator('#exploreBtn, .xp-btn')).toHaveCount(0);
    await expect(page.locator('body > header.md-header')).toHaveCSS('position', 'sticky');
  });
});

test.describe('color scheme button', () => {
  const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('switches Daybreak and Deep Space, shows the sun or the moon, and is remembered', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const btn = page.locator('#themeBtn');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
    await expect(btn.locator('.md-theme-sun')).toBeVisible();
    await expect(btn.locator('.md-theme-moon')).toBeHidden();
    await expect(btn).toHaveAttribute('aria-label', 'Switch to Deep Space (dark) scheme');
    const light = await bg(page);
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(btn.locator('.md-theme-moon')).toBeVisible();
    await expect(btn).toHaveAttribute('aria-label', 'Switch to Daybreak (light) scheme');
    expect(await bg(page)).not.toBe(light);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#themeBtn .md-theme-moon')).toBeVisible();
    // The browser bar color follows the scheme
    const meta = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(meta?.toLowerCase()).toBe((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())).toLowerCase());
    // Switching back to match the system clears the choice, so the page follows the system again
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('');
    expect(await bg(page)).toBe(light);
  });

  test('follows the system until a choice is made, and a choice overrides it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    const btn = page.locator('#themeBtn');
    await expect(btn.locator('.md-theme-moon')).toBeVisible();
    await expect(btn).toHaveAttribute('title', /following your system/);
    const darkSys = await bg(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(btn.locator('.md-theme-sun')).toBeVisible();
    const lightSys = await bg(page);
    expect(darkSys).not.toBe(lightSys);
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await bg(page)).toBe(darkSys);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('the choice is saved under theme and applied before the page paints', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('theme', 'dark'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* storage blocked */ } });
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#themeBtn .md-theme-moon')).toBeVisible();
  });
});

test.describe('nav', () => {
  test('highlights the current route and only that one', async ({ page }) => {
    for (const [hash, name] of [['#/', 'Home'], ['#/learn', 'Learn'], ['#/arena', 'Arena'], ['#/games', 'Games'], ['#/watch', 'Watch'], ['#/guide', 'Guide'], ['#/find', 'Find']] as const) {
      await open(page, hash);
      const nav = page.locator('header .mq-nav');
      await expect(nav.locator('a[aria-current="true"]')).toHaveCount(1);
      const cur = nav.getByRole('link', { name, exact: true });
      await expect(cur).toHaveAttribute('aria-current', 'true');
      const fill = await cur.evaluate(e => getComputedStyle(e).backgroundColor);
      const other = await nav.locator('a[aria-current="false"]').first().evaluate(e => getComputedStyle(e).backgroundColor);
      expect(fill).not.toBe(other);
    }
  });

  test('a nav link moves to its view and the highlight follows', async ({ page }) => {
    await open(page);
    const nav = page.locator('header .mq-nav');
    await nav.getByRole('link', { name: 'Learn', exact: true }).click();
    await expect(page.locator('#view h1')).toHaveText('Pick a level');
    await expect(nav.getByRole('link', { name: 'Learn', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'false');
  });
});

for (const width of [320, 375, 768]) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: 740 } });
    for (const scheme of ['light', 'dark'] as const) {
      test(`no sideways scroll, every control on screen, nav on its own row (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await open(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        for (const sel of ['.md-brand', '#themeBtn', '#vmMBtn', '#mqChip a']) {
          const b = (await page.locator(sel).boundingBox())!;
          expect(b.x, sel).toBeGreaterThanOrEqual(0);
          expect(b.x + b.width, sel).toBeLessThanOrEqual(width);
        }
        // The nav sits below the controls and wraps: every tab is on screen with no scrolling (a sideways-scrolling
        // row hid Sutras, Watch and Guide off the right edge of a phone)
        const nav = (await page.locator('header .mq-nav').boundingBox())!, theme = (await page.locator('#themeBtn').boundingBox())!;
        expect(nav.y).toBeGreaterThanOrEqual(theme.y + theme.height);
        const tabs = page.locator('header .mq-nav a:visible');
        expect(await tabs.count()).toBeGreaterThanOrEqual(8);
        for (const tab of await tabs.all()) {
          const b = (await tab.boundingBox())!;
          expect(b.x, await tab.innerText()).toBeGreaterThanOrEqual(0);
          expect(b.x + b.width, await tab.innerText()).toBeLessThanOrEqual(width);
        }
        expect(await page.locator('header .mq-nav').evaluate(n => n.scrollWidth <= n.clientWidth)).toBe(true);
        if (width < 600) {
          // Labels give way to icons on phones, and each icon keeps its name
          await expect(page.locator('#vmMBtn .lbl')).toBeHidden();
          await expect(page.locator('#vmMBtn')).toHaveAttribute('aria-label', 'Calm music');
        }
      });
    }
  });
}

test('the music button opens the music panel from the header', async ({ page }) => {
  await open(page);
  await page.locator('#vmMBtn').click();
  await expect(page.locator('#vmMPanel')).toBeVisible();
  await expect(page.locator('#vmMBtn')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#vmMPanel')).toBeHidden();
});

/* Before a Mode is picked every route shows the mode picker, so tabs would do nothing: they appear only after the pick */
test.describe('tabs wait for a Mode', () => {
  test.use({ seedMode: null });
  test('no tabs before the Mode is picked; tabs work after', async ({ page }) => {
    await open(page, '#/');
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await expect(page.locator('.mq-nav')).toBeHidden();
    await page.locator('.mode-card[data-mode="challenger"]').click();
    const nav = page.locator('.mq-nav');
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Learn' }).click();
    await expect(page).toHaveURL(/#\/learn$/);
    await expect(nav.getByRole('link', { name: 'Learn' })).toHaveAttribute('aria-current', 'true');
  });
});
