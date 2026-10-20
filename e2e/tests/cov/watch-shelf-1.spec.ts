import { test, expect, open, cloudLog } from '../fixtures';
import type { Page } from '@playwright/test';

/* watch-shelf: "Videos live in their own data file".
   Scenario "Home does not load the list": a Player opens home and plays a game (answers questions in Times sprint
   to the result screen) without opening anything to watch, and js/videos.js is never requested.
   Scenario "Offline" is covered by e2e/tests/offline.spec.ts (every route renders offline, #/watch branch), which
   needs the built site and the service worker. */

const VIDEO_LIST = /\/js\/videos\.js(\?|$)/;

/** Answers the Times sprint question on screen with its product */
async function answerSprint(page: Page) {
  const area = page.locator('#gArea');
  const q = (await area.locator('.g-q').textContent())!.replace(/,/g, '');
  const [x, y] = q.split('×').map(s => Number(s.trim()));
  await area.locator('.ans-in').fill(String(x * y));
  await area.locator('.ans-in').press('Enter');
}

test('home and a played game never request the video list', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', r => { if (VIDEO_LIST.test(r.url())) asked.push(r.url()); });

  await open(page);
  await expect(page.locator('h1.home-h')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(asked, 'home does not request the video list').toEqual([]);

  // Into a game the way a Player would: the nav, then the game's card
  await page.locator('.mq-nav').getByRole('link', { name: 'Games', exact: true }).click();
  await page.locator('a.mq-game[href="#/game/times-sprint"]').click();
  await expect(page.locator('#view h1')).toHaveText(/Times sprint/);
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();

  for (let i = 0; i < 3; i++) {
    const before = (await page.locator('#gPts').textContent()) || '';
    await answerSprint(page);
    await expect(page.locator('#gPts')).not.toHaveText(before);
  }
  await page.locator('#gQuit').click();
  await expect(page.locator('.g-result .md-kicker')).toHaveText('Practice score');
  await page.locator('#gDone').click(); // Back from the result in the play shell

  // Back home after the game, still nothing to watch opened
  await page.locator('.mq-nav').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('h1.home-h')).toBeVisible();
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(asked, 'the video list is not requested').toEqual([]);
  const loaded = await page.evaluate(re => performance.getEntriesByType('resource').map(e => e.name).filter(n => new RegExp(re).test(n)), VIDEO_LIST.source);
  expect(loaded, 'no resource entry for the video list').toEqual([]);
  expect((await cloudLog(page)).writes.filter(w => w.path.startsWith('boards/g_'))).toEqual([]);
});
