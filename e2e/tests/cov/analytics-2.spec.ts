import { test, expect, open } from '../fixtures';

/* openspec analytics: "Route views are counted / A Star" and "Answer events in untimed play / Practice answer".
   This site's /js/analytics.js is replaced by a stub that only records window.siteTrack paths. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('opening #/star/sq5/2 sends exactly one route view, math/view/star/sq5/star, without the Star number', async ({ page }) => {
  await open(page, '#/star/sq5/2');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  await expect.poll(async () => (await events(page)).filter(e => e.startsWith('math/view/'))).toEqual(['math/view/star/sq5/star']);
});

test('a Practice question answered right on the first try sends one math/q_answered/practice/right', async ({ page }) => {
  await open(page, '#/skill/3-mult');
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  expect(await events(page)).not.toContainEqual(expect.stringMatching(/^math\/q_answered\//));
  await page.locator('#practice .ans-in').fill(String(a * b));
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
  await expect.poll(async () => (await events(page)).filter(e => e.startsWith('math/q_answered/'))).toEqual(['math/q_answered/practice/right']);
});
