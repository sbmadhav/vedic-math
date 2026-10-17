import { test, expect, open, openExplore, chromiumOnly } from './fixtures';

/* The site header (openspec site-header): Vedic Math's header looks and behaves like the header on the rest of
   sbmadhav.com (the home page's): one sticky bar with the brand, the section nav, Explore, the round color scheme
   button and music, in that order. Vedic Math has no kid mode switch; its Player chip sits where the home page has it. */

type Page = import('@playwright/test').Page;

/* The header's controls in order, by kind. Works on the home page (header.nav) and on Vedic Math (header.top). */
const kinds = (page: Page) => page.evaluate(() => {
  const wrap = document.querySelector('body > header .wrap, body > header .md-wrap')!;
  return [...wrap.children].map(e => {
    if (e.matches('.logo, .home')) return 'brand';
    if (e.matches('nav')) return 'nav';
    if (e.matches('#exploreBtn')) return 'explore';
    if (e.matches('#themeBtn')) return 'theme';
    if (e.matches('.music, #mqMusic')) return 'music';
    if (e.matches('#modeToggle')) return 'kid-mode';
    if (e.matches('#mqChip')) return 'player';
    return 'other:' + (e.id || e.className);
  });
});

/* The look of the bar and its shared controls, for comparing the two pages */
const look = async (page: Page) => { await page.evaluate(() => document.fonts.ready); return page.evaluate(() => {
  const h = document.querySelector('body > header')!, cs = getComputedStyle(h);
  const size = (sel: string) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const theme = document.querySelector('#themeBtn')!;
  return {
    position: cs.position, top: cs.top, height: Math.round(h.getBoundingClientRect().height), background: cs.backgroundColor,
    border: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`, backdrop: cs.backdropFilter || (cs as any).webkitBackdropFilter,
    logo: size('body > header svg'), explore: size('#exploreBtn'), theme: size('#themeBtn'), themeRadius: getComputedStyle(theme).borderRadius,
  };
}); };

test.describe('compared with the home page', () => {
  // Pro wording, so Explore reads "Explore" as on the home page (Explorer and Challenger read "Star map")
  test.use({ seedMode: 'pro' });
  test('the header has the same parts, in the same order and look, as the home page of sbmadhav.com', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'compares with the live home page once');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.locator('#themeBtn')).toBeVisible();
    const site = await kinds(page), siteLook = await look(page);
    await open(page);
    const vm = await kinds(page), vmLook = await look(page);
    // Same order of the shared parts; the home page's kid mode switch is the only part Vedic Math leaves out (CLAUDE.md),
    // and the Player chip is the only part it adds, in the same last place
    expect(vm.filter(k => k !== 'player')).toEqual(site.filter(k => k !== 'kid-mode'));
    expect(vm.at(-1)).toBe('player');
    expect(site.at(-1)).toBe('kid-mode');
    expect(vmLook).toEqual(siteLook);
  });
});

test.describe('wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('one sticky row: brand, nav, Explore, color scheme, music, Player chip', async ({ page }) => {
    await open(page);
    expect(await kinds(page)).toEqual(['brand', 'nav', 'explore', 'theme', 'music', 'player']);
    const header = page.locator('header.top');
    await expect(header).toHaveCSS('position', 'sticky');
    const tops = await page.evaluate(() => ['.home', '.mq-nav', '#exploreBtn', '#themeBtn', '#vmMBtn', '#mqChip a']
      .map(s => { const r = document.querySelector(s)!.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }));
    for (const t of tops) expect(Math.abs(t - tops[0])).toBeLessThanOrEqual(2);
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(68);
    // The music control is a pill with its label, like the home page's
    await expect(page.locator('#vmMBtn .lbl')).toHaveText('Music');
    await expect(page.locator('#vmMBtn .lbl')).toBeVisible();
    // Stays at the top while the page scrolls
    await page.mouse.wheel(0, 1200);
    await expect.poll(() => header.evaluate(e => Math.round(e.getBoundingClientRect().top))).toBe(0);
  });
});

test('Explore opens the site menu from the header', async ({ page }) => {
  await open(page);
  const dlg = await openExplore(page);
  await expect(dlg.locator('a[href="/vedic-math/"]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
});

test.describe('color scheme button', () => {
  const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('switches Daybreak and Deep Space, shows the sun or the moon, and is remembered', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const btn = page.locator('#themeBtn');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
    await expect(btn.locator('.sun')).toBeVisible();
    await expect(btn.locator('.moon')).toBeHidden();
    await expect(btn).toHaveAttribute('aria-label', 'Switch to Deep Space (dark) scheme');
    const light = await bg(page);
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(btn.locator('.moon')).toBeVisible();
    await expect(btn).toHaveAttribute('aria-label', 'Switch to Daybreak (light) scheme');
    expect(await bg(page)).not.toBe(light);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#themeBtn .moon')).toBeVisible();
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
    await expect(btn.locator('.moon')).toBeVisible();
    await expect(btn).toHaveAttribute('title', /following your system/);
    const darkSys = await bg(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(btn.locator('.sun')).toBeVisible();
    const lightSys = await bg(page);
    expect(darkSys).not.toBe(lightSys);
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await bg(page)).toBe(darkSys);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('the choice is the same one the rest of sbmadhav.com saves', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('theme', 'dark'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* storage blocked */ } });
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#themeBtn .moon')).toBeVisible();
  });
});

test.describe('nav', () => {
  test('highlights the current route and only that one', async ({ page }) => {
    for (const [hash, name] of [['#/', 'Home'], ['#/learn', 'Learn'], ['#/arena', 'Arena'], ['#/games', 'Games'], ['#/watch', 'Watch'], ['#/guide', 'Guide']] as const) {
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
        for (const sel of ['.home', '#exploreBtn', '#themeBtn', '#vmMBtn', '#mqChip a']) {
          const b = (await page.locator(sel).boundingBox())!;
          expect(b.x, sel).toBeGreaterThanOrEqual(0);
          expect(b.x + b.width, sel).toBeLessThanOrEqual(width);
        }
        // The nav sits below the controls and wraps: every tab is on screen with no scrolling (a sideways-scrolling
        // row hid Sutras, Watch and Guide off the right edge of a phone)
        const nav = (await page.locator('header .mq-nav').boundingBox())!, xp = (await page.locator('#exploreBtn').boundingBox())!;
        expect(nav.y).toBeGreaterThanOrEqual(xp.y + xp.height);
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
          await expect(page.locator('#exploreBtn')).toHaveAttribute('aria-label', /Explore/);
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
