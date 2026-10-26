import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, btn, missTwice, turns } from '../family-kit';

/* analytics spec, delta of change family-helpers, Requirement "Family helper visits are counted", Scenario "A first
   visit": a level 1 Visit and Not now send exactly math/family/visit/1 and math/family/not_now, fixed words only.
   /js/analytics.js is replaced by a stub that records window.siteTrack calls (as analytics.spec.ts does). */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;
test.use({ seedPlayer: ON });

test('A first visit: math/family/visit/1 then math/family/not_now, made only of fixed words', async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await open(page, SKILL);
  await missTwice(page);
  await expect(visit(page)).toHaveAttribute('data-level', '1');
  await turns(page);
  await btn(page, 'Not now').click();
  const fam = await page.evaluate(() => ((globalThis as any).__events as [string, string][]).filter(([p]) => p.startsWith('math/family/')));
  expect(fam.map(([p]) => p)).toEqual(['math/family/visit/1', 'math/family/not_now']);
  for (const [p, t] of fam) { expect(p).toMatch(/^[a-z0-9_/]+$/); expect(t).toBe('Vedic Math: Family helpers'); }
});
