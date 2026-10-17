import { test, expect, APP, open } from '../fixtures';

/* analytics spec, Requirement: Round events.
   - Second Arena round: already asserted by e2e/tests/analytics.spec.ts:83.
   - Stopped round: Stop is asserted by e2e/tests/analytics.spec.ts:103; these tests cover "leaves the page
     before it ends" (a route change and a reload mid-round), for a game round and an Arena round.
   The shared /assets/analytics.js is replaced by a stub whose window.siteTrack reports each path to the test
   through an exposed function, so events survive reloads and no GoatCounter request is made. */
type Page = import('@playwright/test').Page;

async function record(page: Page) {
  const sent: string[] = [];
  await page.exposeFunction('__e2eTrack', (p: string) => { sent.push(p); });
  await page.route(/\/assets\/analytics\.js(\?.*)?$/, route => route.fulfill({
    status: 200, contentType: 'text/javascript',
    body: 'window.siteTrack = (path, title) => { window.__e2eTrack(path); };',
  }));
  return sent;
}
const rounds = (ev: string[]) => ev.filter(e => e.includes('round_end') || e.includes('round2_start'));

test('leaving a game round for another page sends no round_end; the next finished round is r1', async ({ page }) => {
  test.slow();
  const ev = await record(page);
  await page.clock.install();
  await open(page, '#/game/times-sprint');
  await page.locator('#gStart').click();
  await expect(page.locator('#gQuit')).toBeVisible();
  await expect.poll(() => ev).toContain('math/game/times-sprint/ranked'); // the round did start
  // Leave mid-round, then let more than the 60 second round go by
  await page.goto(`${APP}#/`);
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  await page.clock.fastForward(65_000);
  expect(rounds(ev)).toEqual([]);
  // A round that is played to the end is still counted, and as the visit's first
  await page.goto(`${APP}#/game/times-sprint`);
  await page.locator('#gStart').click();
  await expect(page.locator('#gQuit')).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect.poll(() => rounds(ev)).toEqual(['math/round_end/game/challenger/r1']);
});

test('leaving an Arena round for another page sends no round_end; the next finished round is r1', async ({ page }) => {
  test.slow();
  const ev = await record(page);
  await page.clock.install();
  await open(page, '#/arena');
  await page.locator('[data-t="practice"]').click();
  await page.locator('#arGo').click();
  await page.clock.runFor(2_500);
  await expect(page.locator('#arType')).toBeVisible();
  await expect.poll(() => ev).toContain('math/arena/challenger/practice');
  await page.goto(`${APP}#/dojo`);
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  await page.clock.fastForward(65_000);
  expect(rounds(ev)).toEqual([]);
  // Back to the Arena: a finished round is the first round_end, with no round2_start
  await page.goto(`${APP}#/arena`);
  await page.locator('[data-t="practice"]').click();
  await page.locator('#arGo').click();
  await page.clock.runFor(2_500);
  await expect(page.locator('#arType')).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(page.locator('.ar-result')).toBeVisible();
  await expect.poll(() => rounds(ev)).toEqual(['math/round_end/arena/challenger/r1']);
});

test('reloading the page mid game round sends no round_end', async ({ page }) => {
  const ev = await record(page);
  await page.clock.install();
  await open(page, '#/game/times-sprint');
  await page.locator('#gStart').click();
  await expect(page.locator('#gQuit')).toBeVisible();
  await expect.poll(() => ev).toContain('math/game/times-sprint/ranked');
  await page.clock.runFor(10_000);
  await page.reload();
  await expect(page.locator('#gStart')).toBeVisible();
  await page.clock.fastForward(65_000);
  expect(rounds(ev)).toEqual([]);
});
