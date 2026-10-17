import { test, expect, open } from '../fixtures';

/* openspec/specs/analytics/spec.md, Requirement: Once-per-device milestones.
   The shared /assets/analytics.js is replaced by a stub that records window.siteTrack paths in
   window.__events, so nothing is ever sent to GoatCounter. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

/** Answers the multiplication question on a Practice page right (computed from the page) */
async function answerRight(page: Page) {
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.locator('#practice .ans-in').fill(String(a * b));
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
}

test('First win: a new device right 45 seconds after first opening sends first_win/30-60 once, later rights none', async ({ page }) => {
  await page.clock.install();
  await open(page, '#/skill/3-mult');
  await expect(page.locator('#practice #prQ')).toBeVisible();
  // A new device: the first open just set vm.firstSeen, and no milestone has gone yet
  const seen = await page.evaluate(() => [localStorage.getItem('vm.firstSeen'), localStorage.getItem('vm.metrics')]);
  expect(seen[0]).toMatch(/^\d+$/);
  expect(seen[1]).toBeNull();
  await page.clock.fastForward(45_000);
  await answerRight(page);
  await expect.poll(async () => (await events(page)).filter(e => e.startsWith('math/first_win/'))).toEqual(['math/first_win/30-60']);
  // Later right answers, in this page load and the next, send no first_win
  await page.locator('#practice #prCheck').click(); // Next
  await answerRight(page);
  expect((await events(page)).filter(e => e.startsWith('math/first_win/'))).toEqual(['math/first_win/30-60']);
  expect((await events(page)).filter(e => e === 'math/q_answered/practice/right')).toHaveLength(2);
  await page.reload();
  await expect(page.locator('#practice #prQ')).toBeVisible();
  await answerRight(page);
  const ev = await events(page);
  expect(ev).toContain('math/q_answered/practice/right');
  expect(ev.filter(e => e.includes('first_win'))).toEqual([]);
});

test('Return on day 8: return_d7 is sent once, and a later visit on day 9 sends nothing more', async ({ page }) => {
  // Midday local time, so the calendar-day count is exact in any time zone
  const now = new Date(); now.setHours(12, 0, 0, 0);
  const DAY = 864e5;
  const first = now.getTime() - 8 * DAY;
  await page.addInitScript(f => { try { if (!localStorage.getItem('vm.firstSeen')) localStorage.setItem('vm.firstSeen', String(f)); } catch (e) {} }, first);
  await page.clock.setFixedTime(now);
  await open(page);
  await expect.poll(async () => (await events(page)).filter(e => e.startsWith('math/return_'))).toEqual(['math/return_d7']);
  expect(await page.evaluate(() => localStorage.getItem('vm.firstSeen'))).toBe(String(first));

  // Same day, another visit: nothing more
  await page.reload();
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  await expect.poll(async () => (await events(page)).some(e => e.startsWith('math/view/'))).toBe(true);
  expect((await events(page)).filter(e => e.startsWith('math/return_'))).toEqual([]);

  // Day 9: nothing more
  await page.clock.setFixedTime(now.getTime() + DAY);
  await page.reload();
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  await expect.poll(async () => (await events(page)).some(e => e.startsWith('math/view/'))).toBe(true);
  expect((await events(page)).filter(e => e.startsWith('math/return_'))).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('vm.firstSeen'))).toBe(String(first));
});
