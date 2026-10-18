import { test, expect, APP, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* analytics spec, Requirements "Star Quest counts", "Sky views are counted", "Guide and tour counts" and "Play
   experience events": one test per scenario. The shared analytics.js is a stub that records window.siteTrack calls. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const enter = async (page: Page, v: string) => { await page.keyboard.type(v); await page.keyboard.press('Enter'); };
const tag = (page: Page) => page.locator('#stMain .star-tag');

test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('A round with a Comeback that lights the Star: comeback/sq5 and lit/sq5 are each sent once', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await expect(tag(page)).toHaveText('Question 1 of 4');
  await enter(page, '1');
  await expect(page.locator('.star-step').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tag(page)).toHaveText('Rematch');
  await enter(page, await sq(page));
  await expect(page.locator('#stSay')).toContainText('Comeback');
  for (let i = 2; i <= 4; i++) {
    await expect(tag(page)).toHaveText(`Question ${i} of 4`);
    await enter(page, await sq(page));
    await expect(page.locator('#stSay')).toContainText('Sparks');
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  const ev = await events(page);
  expect(ev.filter(e => e === 'math/star/comeback/sq5')).toHaveLength(1);
  expect(ev.filter(e => e === 'math/star/lit/sq5')).toHaveLength(1);
});

test('A Dare lost: dare_taken/by11 is sent and dare_won/by11 is not', async ({ page }) => {
  await open(page, '#/star/by11/1');
  await expect(tag(page)).toHaveText('Question 1 of 4');
  const answer = async () => { const t = (await page.locator('#stQ').innerText()).replace(/,/g, ''); const nums = t.match(/\d+/g)!.map(Number); return String(nums[0] * (nums[1] ?? 11)); };
  await enter(page, await answer());
  await expect(tag(page)).toHaveText('Question 2 of 4');
  await expect(page.locator('#stDare')).toBeVisible();
  await page.locator('#stDare').click();
  await expect(tag(page)).toHaveText('Dare');
  await enter(page, '1');
  await expect(page.locator('.star-replay')).toBeVisible();
  const ev = await events(page);
  expect(ev).toContain('math/star/dare_taken/by11');
  expect(ev).not.toContain('math/star/dare_won/by11');
});

test.describe('Kata progress that lights 12 Stars', () => {
  const katasDone: Record<string, number> = {};
  for (const t of ['from9', 'by11', 'times5', 'sq5']) for (let k = 1; k <= 50; k++) katasDone[`k:${t}:${k}`] = 1;
  test.use({ seedPlayer: { sky: true }, seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, katasDone, ratings: {}, weekSparks: {} } });
  test('Migration: the 12 Stars lit on first load send no math/star/lit event', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-star--lit')).toHaveCount(12);
    await page.waitForTimeout(300);
    expect((await events(page)).filter(e => e.startsWith('math/star/lit'))).toEqual([]);
  });
});

test.describe('Pro with the Sky on', () => {
  test.use({ seedMode: 'pro', seedPlayer: { sky: true } });
  test('Home with the Sky on: one math/view/sky and no math/view/home', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky')).toHaveCount(1);
    await expect.poll(() => events(page)).toContain('math/view/sky');
    const ev = await events(page);
    expect(ev.filter(e => e === 'math/view/sky')).toHaveLength(1);
    expect(ev).not.toContain('math/view/home');
  });
});

test('Guide at a section: #/guide/katas sends one math/view/guide/section', async ({ page }) => {
  await open(page, '#/guide/katas');
  await expect(page.locator('#gdh-katas')).toBeFocused();
  await expect.poll(() => events(page)).toContain('math/view/guide/section');
  expect((await events(page)).filter(e => e === 'math/view/guide/section')).toHaveLength(1);
});

test.describe('the tour on a fresh device', () => {
  test.use({ tourSeen: false, seedMode: null });
  test('Tour finished: every step then Done sends start and finish once each, and no skip', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    const dlg = page.locator('dialog.vm-tour');
    await expect(dlg).toBeVisible();
    const n = Number((await dlg.locator('#tourN').textContent())!.match(/of (\d)/)![1]);
    for (let i = 1; i < n; i++) await dlg.locator('[data-act="next"]').click();
    await dlg.locator('[data-act="next"]', { hasText: 'Done' }).click();
    await expect(dlg).toHaveCount(0);
    expect((await events(page)).filter(e => e.startsWith('math/tour/'))).toEqual(['math/tour/start', 'math/tour/finish']);
  });
  test('Tour skipped with Escape: Escape on the second step sends start and skip once each', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="pro"]').click();
    const dlg = page.locator('dialog.vm-tour');
    await expect(dlg).toBeVisible();
    await dlg.locator('[data-act="next"]').click();
    await expect(dlg.locator('#tourN')).toContainText('2 of');
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);
    expect((await events(page)).filter(e => e.startsWith('math/tour/'))).toEqual(['math/tour/start', 'math/tour/skip']);
  });
});

test('A shared ghost link: opening #/arena/ghosts/r/<code> sends the route view view/play/ghosts', async ({ page }) => {
  await open(page, '#/arena/ghosts');
  const code = await page.evaluate(async () => { const G: any = await import('/vedic-math/js/play/exp/ghosts-core.js' as string); const kind = Object.keys(G.SPRINTS)[0]; return G.encode(G.makeGhost({ kind, lv: 'challenger', seed: 7, n: 3, t: [1000, 2000, 3000], miss: [], nick: null })); });
  await page.evaluate(() => { (window as any).__events.length = 0; });
  await page.goto(`${APP}#/arena/ghosts/r/${code}`);
  await expect(page.locator('#view h1').first()).toHaveText('Ghost Races');
  await expect.poll(() => events(page)).toContain('math/view/play/ghosts');
  expect((await events(page)).filter(e => e.startsWith('math/view/'))).toEqual(['math/view/play/ghosts']);
});
