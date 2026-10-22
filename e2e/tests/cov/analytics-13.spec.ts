import { test, expect, open } from '../fixtures';

/* analytics spec (openspec change sutras-first), Requirement "Following a Sutra tag is counted": one test per scenario.
   The shared analytics.js is replaced by a stub that records window.siteTrack calls, so nothing is counted. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;

test('From a Trick page: one math/sutra_tag/trick event, naming no Sutra, Trick or Mode, then the Deep dive\'s route view', async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await open(page, '#/skill/v-sq5');
  await page.locator('.mq-sutra a.sutra-tag-a').click();
  await expect(page.locator('dialog.sutra-modal #sdTitle')).toBeVisible();
  const ev: [string, string][] = await page.evaluate(() => (globalThis as any).__events || []);
  const tags = ev.filter(([p]) => p.startsWith('math/sutra_tag/'));
  expect(tags).toEqual([['math/sutra_tag/trick', 'Sutra tag: trick']]);
  expect(tags.some(([p, t]) => /sq5|s1|challenger|Ekādhikena/i.test(p + t))).toBe(false);
  const i = ev.findIndex(([p]) => p === 'math/sutra_tag/trick');
  expect(ev.slice(i + 1).some(([p]) => p.startsWith('math/view/sutra'))).toBe(true);
});
