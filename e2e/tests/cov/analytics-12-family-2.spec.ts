import { test, expect, open } from '../fixtures';
import { TRICK, TALK_ON, TEEN, fakeFamilyServer, says, openTalk, sendAndWait } from '../family-talk-kit';

/* analytics spec, delta of change family-helpers, Requirement "Talking with the Family and listening are counted",
   Scenario "A message to the Family": exactly math/family/talk for a message, fixed words only, never the words typed
   or the reply. /js/analytics.js is replaced by a stub that records window.siteTrack calls (as analytics.spec.ts does). */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

test('A message to the Family: exactly math/family/talk, and no event holds the words typed or the reply', async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await fakeFamilyServer(page, () => says(['bolt', 'Because the distances multiply into the right part.']));
  await open(page, TRICK);
  await openTalk(page);
  const before = await page.evaluate(() => ((globalThis as any).__events as [string, string][]).length);
  await sendAndWait(page, 'why do we add 1?', 'Bolt');
  const events = await page.evaluate(n => ((globalThis as any).__events as [string, string][]).slice(n), before);
  const fam = events.filter(([p]) => p.startsWith('math/family/'));
  expect(fam.map(([p]) => p)).toEqual(['math/family/talk']);
  for (const [p, t] of fam) { expect(p).toMatch(/^[a-z0-9_/]+$/); expect(t).toBe('Vedic Math: Family helpers'); }
  expect(JSON.stringify(events)).not.toMatch(/add 1|distances multiply|near-base/);
});
