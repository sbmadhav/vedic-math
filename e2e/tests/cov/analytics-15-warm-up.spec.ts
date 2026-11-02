import { test, expect } from '../fixtures';
import { openWarm, nextUntil, backToStart } from '../warm-up-kit';

/* analytics spec (change teacher-warm-up), Requirement "Warm-up counts", Scenario "A whole warm-up". This site's
   /js/analytics.js is replaced by a stub that only records window.siteTrack paths. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path) => { window.__events.push(path); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);

test.use({ seedMode: null });

test('A whole warm-up: through Multiply by 11 twice without reloading sends math/teachers/warmup/start/by11 and .../done/by11 once each, fixed words only', async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await openWarm(page, 'by11');
  expect(await events(page)).toEqual([]);
  await page.locator('#wuNext').click();
  await expect.poll(() => events(page)).toEqual(['math/teachers/warmup/start/by11']);
  await nextUntil(page, 'Practice at home');
  await expect.poll(() => events(page)).toEqual(['math/teachers/warmup/start/by11', 'math/teachers/warmup/done/by11']);
  // once more, without reloading: Back to the start and through again
  await backToStart(page);
  await expect(page.locator('#wuExBoard .sb-step')).toHaveCount(0);
  await nextUntil(page, 'Practice at home');
  expect(await events(page)).toEqual(['math/teachers/warmup/start/by11', 'math/teachers/warmup/done/by11']);
  for (const e of await events(page)) expect(e).toMatch(/^math\/teachers\/warmup\/(start|done)\/[a-z0-9-]+$/);
});
