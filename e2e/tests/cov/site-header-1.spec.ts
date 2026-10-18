import { test, expect, open, chromiumOnly } from '../fixtures';

/* site-header spec, Requirement "The header matches the rest of sbmadhav.com": one test per scenario. The "Same look"
   scenario compares with the live home page of sbmadhav.com once (e2e/tests/header.spec.ts has the same comparison). */
type Page = import('@playwright/test').Page;

/* The header's controls in order, by kind, on the home page (md-header) and on Vedic Math (header.top) */
const kinds = (page: Page) => page.evaluate(() => {
  const wrap = document.querySelector('body > header .wrap, body > header .md-wrap')!;
  const parts = [...wrap.children].flatMap(e => e.matches('.md-header-end') ? [...e.children] : [e]);
  return parts.map(e => {
    if (e.matches('.logo, .home, .md-brand')) return 'brand';
    if (e.matches('nav')) return 'nav';
    if (e.matches('#exploreBtn')) return 'explore';
    if (e.matches('#themeBtn')) return 'theme';
    if (e.matches('.music, #mqMusic, .md-music')) return 'music';
    if (e.matches('#modeToggle')) return 'kid-mode';
    if (e.matches('#mqChip')) return 'player';
    return 'other:' + (e.id || e.className);
  });
});

const look = async (page: Page) => { await page.evaluate(() => document.fonts.ready); return page.evaluate(() => {
  const h = document.querySelector('body > header')!, cs = getComputedStyle(h);
  const size = (sel: string) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const theme = document.querySelector('#themeBtn')!;
  return {
    height: Math.round(h.getBoundingClientRect().height), background: cs.backgroundColor,
    border: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`, backdrop: cs.backdropFilter || (cs as any).webkitBackdropFilter,
    logo: size('body > header svg'), explore: size('#exploreBtn'), theme: size('#themeBtn'), themeRadius: getComputedStyle(theme).borderRadius,
  };
}); };

test.use({ viewport: { width: 1280, height: 800 } });

test('Same parts in the same order: brand, the nav tabs, Explore, color scheme, Music and the Player chip in one row', async ({ page }) => {
  await open(page);
  expect(await kinds(page)).toEqual(['brand', 'nav', 'explore', 'theme', 'music', 'player']);
  const tabs = await page.locator('header .mq-nav a:visible').allInnerTexts();
  expect(tabs.map(t => t.trim())).toEqual(['Home', 'Learn', 'Dojo', 'Arena', 'Games', 'Sutras', 'Watch', 'Guide']);
  const tops = await page.evaluate(() => ['.home', '.mq-nav', '#exploreBtn', '#themeBtn', '#vmMBtn', '#mqChip a']
    .map(s => { const r = document.querySelector(s)!.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }));
  for (const t of tops) expect(Math.abs(t - tops[0])).toBeLessThanOrEqual(2);
});

test.describe('Pro wording, as on the home page', () => {
  test.use({ seedMode: 'pro' });
  test('Same look: the Vedic Math header and the home page header share height, background, blur, border and control sizes', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'compares with the live home page once');
    await page.goto('/');
    await expect(page.locator('#themeBtn')).toBeVisible();
    const site = await kinds(page), siteLook = await look(page);
    await open(page);
    const vm = await kinds(page), vmLook = await look(page);
    expect(vm.filter(k => k !== 'player')).toEqual(site.filter(k => k !== 'kid-mode'));
    expect(vmLook).toEqual(siteLook);
  });
});

test('Stays on top: the header is still at the top after scrolling a long view', async ({ page }) => {
  await open(page, '#/guide');
  const header = page.locator('header.top');
  await expect(header).toHaveCSS('position', 'sticky');
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  await expect.poll(() => header.evaluate(e => Math.round(e.getBoundingClientRect().top))).toBe(0);
});
