import { test, expect, open } from '../fixtures';
import { box, question, twoStepAnswer } from '../word-kit';

/* analytics spec (change word-problems), Requirement "Word problems are counted". This site's /js/analytics.js is
   replaced by a stub that only records window.siteTrack paths. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test('A Word problem answered after its first hint: math/story/asking, then math/story/practice/right, fixed words only', async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await open(page, '#/skill/3-twostep');
  const answer = twoStepAnswer((await question(page).textContent()) || '');
  await box(page).locator('#prHint').click();
  await box(page).locator('.ans-in').fill(String(answer));
  await box(page).locator('#prCheck').click();
  await expect(box(page).locator('#prSay')).toHaveClass(/\bok\b/);
  await expect.poll(async () => (await events(page)).filter(e => e.startsWith('math/story/'))).toEqual(['math/story/asking', 'math/story/practice/right']);
});
