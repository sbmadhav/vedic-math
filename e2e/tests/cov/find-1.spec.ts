import AxeBuilder from '@axe-core/playwright';
import { test, expect, open, APP } from '../fixtures';

/* find spec: one test per scenario. The shared analytics.js is replaced by a stub that records window.siteTrack calls. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const hits = (page: Page) => page.locator('#findOut .find-hit');
const group = (page: Page, name: string) => page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: name }) }).locator('.find-hit');

/* find spec (as modified by openspec change play-nav-by-mode): Find is the Find trigger at the end of the menu */
test('From the menu bar: Find opens with the box focused and marked current', async ({ page }) => {
  await open(page);
  await page.locator('.mq-nav a[href="#/find"]').click();
  await expect(page).toHaveURL(/#\/find$/);
  await expect(page.locator('#findIn')).toBeFocused();
  await expect(page.locator('.mq-nav a[href="#/find"]')).toHaveAttribute('aria-current', 'true');
});

test('The slash key: / on the Dojo page opens Find with the box focused', async ({ page }) => {
  await open(page, '#/dojo');
  await page.keyboard.press('/');
  await expect(page).toHaveURL(/#\/find$/);
  await expect(page.locator('#findIn')).toBeFocused();
});

test.describe('no Mode', () => {
  test.use({ seedMode: null });
  test("Before a Mode: the landing's Find link opens the Find page, not the mode picker", async ({ page }) => {
    await page.goto(`${APP}#/find`); /* a link to the game's Find (the picker's own Find link is gone: openspec change play-nav-by-mode) */
    await expect(page.locator('#findIn')).toBeVisible();
    await expect(page.locator('.mode-pick')).toHaveCount(0);
  });
});

test('A Skill by name: "fractions" lists Skills about fractions, each opening #/skill/<id>', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('fractions');
  const skills = group(page, 'Skills');
  expect(await skills.count()).toBeGreaterThanOrEqual(3);
  for (const s of await skills.all()) { expect(await s.getAttribute('href')).toMatch(/^#\/skill\/[\w-]+$/); await expect(s).toContainText(/fraction/i); }
});

test('A Sutra in plain letters: "urdhva" lists Ūrdhva-Tiryagbhyām under Sutras, opening its deep dive', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('urdhva');
  const s = group(page, 'Sutras').first();
  await expect(s.locator('b')).toHaveText('Ūrdhva-Tiryagbhyām');
  await s.click();
  await expect(page).toHaveURL(/#\/sutras\/s3$/);
  await expect(page.locator('.sutra-modal[open]')).toBeVisible();
});

test('A video: typing a video title and following the result opens the player in place with that video', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('count to 20');
  const v = group(page, 'Videos').first();
  await expect(v).toBeVisible();
  await expect(v.locator('b')).toHaveText('Count to 20');
  await v.click();
  await expect(page.locator('dialog.vm-player[open]')).toBeVisible();
  await expect(page.locator('#vpTitle')).toContainText('Count to 20');
  await expect(page).toHaveURL(/#\/find$/);
});

test('Take away: the Trick "Subtract from 100, 1000, 10000" is among the first three results', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('take away');
  expect((await hits(page).locator('b').allInnerTexts()).slice(0, 3)).toContain('Subtract from 100, 1000, 10000');
});

test('Settings: Me is the first result', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('settings');
  await expect(hits(page).first().locator('b')).toHaveText('Me');
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('Title first: "arena" puts the Arena section first, above the guide sections that mention it', async ({ page }) => {
    await open(page, '#/find');
    await page.locator('#findIn').fill('arena');
    await expect(hits(page).first().locator('b')).toHaveText('Arena');
    await expect(hits(page).first()).toHaveAttribute('href', '#/arena');
    expect(await group(page, 'Guide').count()).toBeGreaterThan(0);
  });
});

test('Eight per kind: "number" lists at most eight results in any kind', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('number');
  const groups = page.locator('#findOut .find-group');
  expect(await groups.count()).toBeGreaterThan(2);
  for (const g of await groups.all()) expect(await g.locator('.find-hit').count()).toBeLessThanOrEqual(8);
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer sees only its own experiences and games: "spell" and "sprint" list nothing', async ({ page }) => {
    await open(page, '#/find');
    await page.locator('#findIn').fill('spell');
    await expect(page.locator('#findCount')).toHaveText('Nothing matched');
    await page.locator('#findIn').fill('sprint');
    await expect(page.locator('#findCount')).toHaveText('Nothing matched');
  });
  test('Explorer titles: "fives" lists the Trick as "Fives squared in one breath"', async ({ page }) => {
    await open(page, '#/find');
    await page.locator('#findIn').fill('fives');
    await expect(group(page, 'Speed tricks').first().locator('b')).toHaveText('Fives squared in one breath');
  });
});

test('Empty box: the browse list names every section with one line each', async ({ page }) => {
  await open(page, '#/find');
  await expect(hits(page).locator('b')).toHaveText(['Home', 'Sutras', 'Learn', 'Arcade', 'Dojo', 'Arena', 'Games', 'Watch', 'Me', 'Guide']); /* with the Arcade zone (openspec change play-nav-by-mode) */
  for (const h of await hits(page).all()) expect((await h.locator('small').innerText()).length).toBeGreaterThan(20);
});

test('No match: "zzzz" says nothing matched and shows the browse list', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('zzzz');
  await expect(page.locator('#findCount')).toHaveText('Nothing matched');
  await expect(page.locator('.find-none')).toBeVisible();
  await expect(hits(page).first().locator('b')).toHaveText('Home');
});

test('Enter opens the first result: "arena" then Enter opens the Arena page', async ({ page }) => {
  await open(page, '#/find');
  await page.locator('#findIn').fill('arena');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/arena$/);
  await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Accessible: axe finds no serious or critical violation with results showing (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, '#/find');
    await page.locator('#findIn').fill('squares');
    await expect(hits(page).first()).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
}

test('Typing and following: no request carries the text, the address is the result\'s route, and exactly one math/find/go is sent', async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  const urls: string[] = [];
  page.on('request', r => urls.push(r.url() + ' ' + (r.postData() || '')));
  await open(page, '#/find');
  await page.locator('#findIn').fill('squares');
  await hits(page).first().click();
  await expect(page).toHaveURL(/#\/skill\/v-sq5$/);
  expect(urls.some(u => /squares/i.test(u))).toBe(false);
  const ev: string[] = await page.evaluate(() => (globalThis as any).__events || []);
  expect(ev.filter(e => e.startsWith('math/find/'))).toEqual(['math/find/go']);
  expect(ev.some(e => /squares/i.test(e))).toBe(false);
});
