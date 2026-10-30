import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, open, appErrors } from './fixtures';

/* Find (openspec find): a page in the menu bar with one box over every named thing, built in the page from the
   catalogs. Analytics is stubbed so the one fixed event can be checked; the request log shows nothing typed leaves. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const hits = (page: Page) => page.locator('#findOut .find-hit');
const groups = (page: Page) => page.locator('#findOut .find-group h2').allInnerTexts();

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('Find in the menu bar opens the page with the box focused and Find current; empty, it shows the browse list', async ({ page, issues }) => {
  await open(page);
  await page.locator('.mq-nav a[href="#/find"]').click();
  await expect(page).toHaveURL(/#\/find$/);
  await expect(page.locator('#view h1')).toHaveText('Find anything');
  await expect(page.locator('#findIn')).toBeFocused();
  await expect(page.locator('.mq-nav a[href="#/find"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#findOut h2')).toHaveText('Browse');
  await expect(hits(page).locator('b')).toHaveText(['Home', 'Sutras', 'Learn', 'Arcade', 'Dojo', 'Arena', 'Games', 'Watch', 'Me', 'Guide']); /* with the Arcade zone (openspec change play-nav-by-mode) */
  for (const h of await hits(page).all()) expect((await h.locator('small').innerText()).length).toBeGreaterThan(20);
  await expect(page.locator('#view')).not.toContainText(/\u2014/);
  expect(appErrors(issues)).toEqual([]);
});

test('the / key opens Find from the Dojo, but not while typing in a field', async ({ page }) => {
  await open(page, '#/dojo');
  await page.keyboard.press('/');
  await expect(page).toHaveURL(/#\/find$/);
  await expect(page.locator('#findIn')).toBeFocused();
  await page.keyboard.type('a/b');
  await expect(page.locator('#findIn')).toHaveValue('a/b');
  await expect(page).toHaveURL(/#\/find$/);
});

test('the / key still opens Find after a Sutra card is flipped (an expanded control in the view is not a menu)', async ({ page }) => {
  await open(page, '#/sutras');
  const face = page.locator('.sutra-face').first();
  await face.click();
  await expect(face).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('/');
  await expect(page).toHaveURL(/#\/find$/);
  await expect(page.locator('#findIn')).toBeFocused();
});

test('Enter with nothing typed or nothing matched opens nothing from the browse list', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').press('Enter');
  await expect(page).toHaveURL(/#\/find$/);
  await page.locator('#findIn').fill('zzzz');
  await page.locator('#findIn').press('Enter');
  await expect(page).toHaveURL(/#\/find$/);
  expect((await events(page)).filter(e => e.startsWith('math/find/'))).toEqual([]);
});

test('results come grouped and ranked: a Skill by name, a Sutra in plain letters, a plain word, a setting, a video', async ({ page }) => {
  await open(page, '#/find');
  const box = page.locator('#findIn');
  await box.fill('fractions');
  await expect(page.locator('#findCount')).toHaveText(/\d+ results/);
  const skills = page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: 'Skills' }) }).locator('.find-hit');
  expect(await skills.count()).toBeGreaterThanOrEqual(3);
  for (const s of await skills.all()) expect(await s.getAttribute('href')).toMatch(/^#\/skill\/[\w-]+$/);
  await box.fill('urdhva');
  const sutras = page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: 'Sutras' }) }).locator('.find-hit');
  await expect(sutras.first().locator('b')).toHaveText('Ūrdhva-Tiryagbhyām');
  await expect(sutras.first()).toHaveAttribute('href', '#/sutras/s3');
  await box.fill('take away');
  const tricks = page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: 'Tricks' }) }).locator('.find-hit b');
  expect((await tricks.allInnerTexts()).slice(0, 3)).toContain('Subtract from 100, 1000, 10000');
  await box.fill('settings');
  await expect(hits(page).first().locator('b')).toHaveText('Me');
  await expect(hits(page).first()).toHaveAttribute('href', '#/me');
  await box.fill('arena');
  await expect(hits(page).first().locator('b')).toHaveText('Arena');
  expect(await groups(page)).toEqual(expect.arrayContaining(['Sections', 'Guide']));
  // Videos arrive once the lazy list has loaded, and open the player in place
  await box.fill('count to 20');
  const video = page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: 'Videos' }) }).locator('button.find-hit').first();
  await expect(video).toBeVisible();
  await video.click();
  await expect(page.locator('dialog.vm-player[open] .vp-play')).toBeVisible(); // the player, on its facade until play is pressed
  await expect(page).toHaveURL(/#\/find$/);
});

test('at most eight results per kind; nothing matched says so and shows the browse list', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('number');
  for (const g of await page.locator('#findOut .find-group').all()) expect(await g.locator('.find-hit').count()).toBeLessThanOrEqual(8);
  await page.locator('#findIn').fill('zzzz');
  await expect(page.locator('#findCount')).toHaveText('Nothing matched');
  await expect(page.locator('.find-none')).toContainText('Nothing called that here');
  await expect(page.locator('.find-none a[href="#/guide"]')).toBeVisible();
  await expect(page.locator('#findOut h2').first()).toHaveText('Browse');
});

test('keyboard: Enter opens the first result, Down moves to it, Escape clears the box; one math/find/go and nothing typed leaves', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', r => urls.push(r.url()));
  await open(page, '#/find');
  const box = page.locator('#findIn');
  await box.fill('squares');
  await page.keyboard.press('ArrowDown');
  await expect(hits(page).first()).toBeFocused();
  await box.focus();
  await page.keyboard.press('Escape');
  await expect(box).toHaveValue('');
  await expect(page.locator('#findOut h2').first()).toHaveText('Browse');
  await box.fill('squares');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/skill\/v-sq5$/);
  expect((await events(page)).filter(e => e.startsWith('math/find/'))).toEqual(['math/find/go']);
  expect((await events(page)).some(e => /squares/i.test(e))).toBe(false); /* the opened page's route view names a catalog id, never the text */
  expect(urls.some(u => /squares/i.test(u))).toBe(false);
  expect(await page.evaluate(() => Object.entries(localStorage).some(([, v]) => /squares/.test(String(v))))).toBe(false);
});

/* The live audit of 2026-10-20 (openspec change find-and-home-polish): phrases, questions and plain words */
const group = (page: Page, name: string) => page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: name }) }).locator('.find-hit');
test('questions and phrases: a share of the words, Best match for questions, Play modes, kind words; one math/find/go', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', r => urls.push(r.url()));
  await open(page, '#/find');
  const box = page.locator('#findIn');
  await expect(page.locator('.find-hint')).toHaveText('Try: squares, multiply, take away, leaderboard, for kids, how it works');
  await box.fill('multiply big numbers');
  expect((await groups(page))[0]).toBe('Tricks');
  await expect(group(page, 'Tricks').first().locator('b')).toHaveText('Multiply any two numbers in one line');
  await box.fill('how does it work');
  expect(await groups(page)).toEqual(['Best match']);
  await expect(page.locator('#findOut .find-group--top .find-hit').first()).toHaveAttribute('href', '#/guide');
  await box.fill('what is vedic math');
  expect((await groups(page))[0]).toBe('Best match');
  await expect(group(page, 'Best match').first()).toHaveAttribute('href', '#/sutras');
  await box.fill('games');
  expect(await group(page, 'Games').count()).toBeGreaterThanOrEqual(4);
  await box.fill('arena zzzz');
  await expect(hits(page).first().locator('b')).toHaveText('Arena');
  await box.fill('for kids');
  expect((await groups(page))[0]).toBe('Best match');
  const kids = group(page, 'Best match').first();
  await expect(kids.locator('b')).toHaveText('Explorer Mode');
  await expect(kids).toHaveAttribute('href', '#/me');
  // Every result keeps its title as its name, and the Best match group has its own border in the theme's tokens
  await expect(kids).toHaveAccessibleName(/^Explorer Mode/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/me$/);
  await expect(page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]')).toBeVisible();
  expect((await events(page)).filter(e => e.startsWith('math/find/'))).toEqual(['math/find/go']);
  expect(urls.some(u => /zzzz|big(%20|\+| )numbers|for(%20|\+| )kids|does(%20|\+| )it/i.test(u))).toBe(false);
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('sees Explorer words and only what it can open: no Dojo experience, no Challenger game, no Dojo in the browse list, and the Sutras right after Home (openspec change sutras-first)', async ({ page }) => {
    await open(page, '#/find');
    await expect(page.locator('#view h1')).toHaveText('What do you want to find?');
    await expect(hits(page).locator('b')).toHaveText(['Home', 'Sutras', 'Learn', 'Arena', 'Games', 'Watch', 'Me', 'Guide']);
    await page.locator('#findIn').fill('spell');
    await expect(page.locator('#findCount')).toHaveText('Nothing matched');
    await page.locator('#findIn').fill('sprint');
    await expect(page.locator('#findCount')).toHaveText('Nothing matched');
    await page.locator('#findIn').fill('fives');
    await expect(page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: 'Speed tricks' }) }).locator('.find-hit b').first()).toHaveText('Fives squared in one breath');
    // "how" among other words is a search, not a question about the app
    await page.locator('#findIn').fill('how many dots');
    expect(await groups(page)).not.toContain('Best match');
    await expect(hits(page).locator('b', { hasText: 'How many dots?' }).first()).toBeVisible();
  });
});

test.describe('no Mode yet', () => {
  test.use({ seedMode: null });
  test('opens before a Mode is picked, with Challenger words', async ({ page }) => {
    await open(page, '#/find');
    await expect(page.locator('#findIn')).toBeVisible();
    await expect(page.locator('.mode-pick')).toHaveCount(0);
    await expect(hits(page).locator('b')).toContainText(['Sutras', 'Dojo']);
  });
  test('a result followed before a Mode opens the mode picker, then that result once a Mode is picked', async ({ page }) => {
    await open(page, '#/find');
    await page.locator('#findIn').fill('fractions');
    const hit = page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: 'Skills' }) }).locator('a.find-hit').first();
    const href = await hit.getAttribute('href');
    expect(href).toMatch(/^#\/skill\/[\w-]+$/);
    await hit.click();
    await expect(page.locator('.mode-pick')).toBeVisible();
    await page.locator('[data-mode="challenger"]').click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace(/[/]/g, '\\/')}$`));
    await expect(page.locator('.mode-pick')).toHaveCount(0);
    await expect(page.locator('.mq-nav a[href="#/learn"]')).toBeVisible();
  });
  test('a result the picked Mode cannot open goes Home instead', async ({ page }) => {
    await open(page, '#/find');
    await page.locator('#findIn').fill('sprint');
    await page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: 'Games' }) }).locator('a.find-hit').first().click();
    await expect(page.locator('.mode-pick')).toBeVisible();
    await page.locator('[data-mode="explorer"]').click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('#view h1')).toHaveText('What do you want to play?');
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`accessible with results showing (${scheme}), and nothing scrolls sideways at 320 px`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, '#/find');
    for (const q of ['squares', 'how does it work']) { /* a Best match group too */
      await page.locator('#findIn').fill(q);
      await expect(hits(page).first()).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical'), q).toEqual([]);
    }
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}
