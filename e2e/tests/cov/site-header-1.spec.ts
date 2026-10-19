import { test, expect, open } from '../fixtures';

/* site-header spec (change learnvedicmath), Requirement "The header is the Learn Vedic Math header": one test per
   scenario. Every page uses the same sticky header from theme/header.html, with no Explore button and no kid mode
   switch. Also the menu tooltips (Requirement "Nav shows the current route"). */
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
    if (e.matches('#modeToggle')) return 'kid-mode';
    if (e.matches('#mqChip')) return 'player';
    return 'other:' + (e.id || e.className);
  });
});

test.use({ viewport: { width: 1280, height: 800 } });

test('Game header: brand, the game nav, color scheme, Music and the Player chip in one row, and no Explore button', async ({ page }) => {
  await open(page);
  expect(await kinds(page)).toEqual(['brand', 'nav', 'theme', 'music', 'player']);
  await expect(page.locator('body > header .md-brand')).toHaveAttribute('href', '/?home');
  await expect(page.locator('body > header .md-brand')).toContainText('Learn Vedic Math');
  const tabs = await page.locator('header .mq-nav a:visible').allInnerTexts();
  expect(tabs.map(t => t.trim())).toEqual(['Home', 'Learn', 'Dojo', 'Arena', 'Games', 'Sutras', 'Watch', 'Guide', 'Find']);
  const tops = await page.evaluate(() => ['.md-brand', '.mq-nav', '#themeBtn', '#vmMBtn', '#mqChip a']
    .map(s => { const r = document.querySelector(s)!.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }));
  for (const t of tops) expect(Math.abs(t - tops[0])).toBeLessThanOrEqual(2);
});

test('Landing header: the brand, links to Play and the grown-up pages, and the color scheme button', async ({ page }) => {
  await page.goto('/?home'); // this device has a Player, who would otherwise go straight into the game
  expect(await kinds(page)).toEqual(['brand', 'nav', 'theme']);
  const links = await page.locator('body > header nav a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  expect(links).toEqual(['/play/', '/parents/', '/teachers/']);
});

test('One line per menu item: the Dojo link\'s tooltip is the line Find\'s browse list shows for the Dojo', async ({ page }) => {
  await open(page);
  const tip = await page.locator('.mq-nav a[href="#/dojo"]').getAttribute('title');
  expect(tip).toMatch(/speed tricks/i);
  await open(page, '#/find');
  await expect(page.locator('.find-hit[href="#/dojo"] small')).toHaveText(tip!);
  // Every menu link carries one
  for (const a of await page.locator('.mq-nav a').all()) expect((await a.getAttribute('title'))!.length).toBeGreaterThan(20);
});

test('Stays on top: the header is still at the top after scrolling a long view', async ({ page }) => {
  await open(page, '#/guide');
  const header = page.locator('body > header.md-header');
  await expect(header).toHaveCSS('position', 'sticky');
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  await expect.poll(() => header.evaluate(e => Math.round(e.getBoundingClientRect().top))).toBe(0);
});
