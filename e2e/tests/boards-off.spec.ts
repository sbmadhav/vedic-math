import AxeBuilder from '@axe-core/playwright';
import { test, expect, open, cloudLog, typeAnswer, worldBoardsOn, chromiumOnly, FIREBASE_SDK } from './fixtures';
import type { Page } from '@playwright/test';

/* The device-only launch (change learnvedicmath, tasks 1.8 and 8.5): learnvedicmath.com launches before its Firebase
   project exists, so js/cloud-config.js has FIREBASE = null. Then every Player, even one whose Age answer is 13 or
   over, sees the Device board only, is never asked the age question, and nothing loads Firebase. The World-board specs
   skip in this state (needsWorldBoards); these run in it instead, and skip once task 8.5 serves a config. */

test.beforeEach(async ({ page }) => {
  test.skip(await worldBoardsOn(page), 'World boards are on: the World-board specs cover this server');
});

/* Every request the page made for the Firebase SDK or a Google backend */
function firebaseRequests(page: Page) {
  const seen: string[] = [];
  page.on('request', r => { if (FIREBASE_SDK.test(r.url()) || /googleapis\.com|firebaseapp\.com|recaptcha/.test(r.url())) seen.push(r.url()); });
  return seen;
}

test.describe('a Player 13 or over', () => {
  test.use({ seedConsent: { age: 'adult' } });

  test('the Arena boards show This device only, with no Show World board button and no Firebase request', async ({ page }) => {
    const seen = firebaseRequests(page);
    await open(page, '#/arena');
    for (const id of ['#lbDay', '#lbWeek', '#lbSparks']) {
      const board = page.locator(id);
      await expect(board.locator('.lb-src')).toHaveText('This device');
      await expect(board.locator('[data-show-world], [data-src="world"]')).toHaveCount(0);
    }
    await open(page, '#/game/times-sprint');
    await expect(page.locator('#gbDay .lb-src')).toHaveText('This device');
    await expect(page.locator('#gbDay [data-show-world]')).toHaveCount(0);
    expect(seen).toEqual([]);
    const log = await cloudLog(page);
    expect(log.reads).toEqual([]);
    expect(log.apps).toEqual([]);
  });

  test('a Ranked Arena round ends on the Device board: no age question, no sign-in, no post', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', "Arena rounds need the faked clock, which WebKit's requestAnimationFrame does not follow evenly");
    test.setTimeout(90_000);
    const seen = firebaseRequests(page);
    await page.clock.install();
    await open(page, '#/arena');
    const day = await page.evaluate(async () => (await import('/js/cloud.js' as string)).dayId() as string);
    const answer = await page.evaluate(async d => (await import('/js/arena.js' as string)).dailySet('challenger', d)[0].answer, day);
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500); // 3, 2, 1
    await typeAnswer(page, String(answer));
    await page.locator('#arForm button').click();
    await expect(page.locator('#arScore')).toHaveText('10');
    await page.clock.fastForward(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();
    // The Score is on this device's boards (today's and this week's), and nothing was asked or sent
    const wk = await page.evaluate(async () => (await import('/js/cloud.js' as string)).weekId() as string);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]').map((e: any) => `${e.board}:${e.score}`).sort()))
      .toEqual([`daily-${day}-challenger:10`, `week-${wk}-challenger:10`]);
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    const log = await cloudLog(page);
    expect(log.writes).toEqual([]);
    expect(log.signIns).toBe(0);
    expect(log.authLoaded).toBe(false);
    expect(seen).toEqual([]);
  });

  test('the Me page and the parent note say World boards are switched off', async ({ page }) => {
    await open(page, '#/me');
    await expect(page.locator('#worldBoards')).toContainText('World boards are switched off on this site, so every score stays on this device.');
    await expect(page.locator('#wbAsk')).toHaveCount(0);
    await page.locator('details.pn summary').first().click();
    await expect(page.locator('details.pn .pn-now').first()).toHaveText('Right now no score is sent anywhere: World boards are switched off on this site, so every score stays in this browser. If they are switched on, this is what they keep.');
  });
});

test.describe('an under-13 Player', () => {
  test.use({ seedConsent: { age: 10 } });
  test('sees the same Device board and the same switched-off note (nothing about their age is shown)', async ({ page }) => {
    await open(page, '#/arena');
    await expect(page.locator('#lbDay .lb-src')).toHaveText('This device');
    await expect(page.locator('#lbDay .lb-why')).toHaveCount(0);
    await page.locator('details.pn summary').first().click();
    await expect(page.locator('details.pn .pn-now').first()).toContainText('World boards are switched off on this site');
  });
});

/* The Me page's World boards section in this state, in both color schemes (a11y.spec.ts checks it with World boards on) */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme, seedConsent: { age: 8 } });
    test('the switched-off World boards section has no serious or critical axe violations', async ({ page }, testInfo) => {
      chromiumOnly(testInfo);
      await open(page, '#/me');
      await expect(page.locator('#worldBoards')).toContainText('World boards are switched off on this site');
      const res = await new AxeBuilder({ page }).include('#worldBoards').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
      expect(res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([]);
    });
  });
}
