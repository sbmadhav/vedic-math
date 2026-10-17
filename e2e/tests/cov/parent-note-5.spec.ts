import { test, expect, open, cloudLog } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec parent-note, "The note mentions videos": Videos SHALL stay available without the Parent step.
   Scenario "Under 13 without the Parent step": an under-13 Player without the Parent step opens a video, and it
   plays. tests/privacy.spec.ts covers Pro from the Watch shelf on chromium; this adds Explorer and Challenger, the
   Watch box on a Skill page, and WebKit. YouTube is answered locally, so no third-party player loads. */

async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
}

/** The player is open, holds the privacy-enhanced embed set to play, and no Age or Parent sheet stands in the way. */
async function expectPlaying(page: Page, yt?: string) {
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toBeVisible();
  await expect(dlg).toHaveJSProperty('open', true);
  const src = yt ? new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${yt}\\?autoplay=1&`) : /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1&/;
  await expect(dlg.locator('iframe')).toHaveAttribute('src', src);
  await expect(dlg.locator('iframe')).toHaveAttribute('allow', /autoplay/);
  await expect(page.locator('dialog.vm-sheet[open]')).toHaveCount(0);
  expect((await cloudLog(page)).writes).toEqual([]);
}

for (const [mode, age, skill] of [['explorer', 7, 'k-count'], ['challenger', 10, 'v-near-base']] as const) {
  test.describe(`${mode}, age ${age}, no Parent step`, () => {
    test.use({ seedMode: mode, seedConsent: { age } });
    test.beforeEach(async ({ page }) => { await noYouTube(page); });

    test('a video from the Watch shelf plays', async ({ page }) => {
      await open(page, '#/watch');
      const card = page.locator('#view button.watch-card').first();
      await expect(card).toBeVisible();
      const yt = await card.getAttribute('data-watch');
      await card.click();
      await expectPlaying(page, yt || undefined);
    });

    test('a video from a Skill page Watch box plays', async ({ page }) => {
      await open(page, `#/skill/${skill}`);
      const btn = page.locator('[data-watch-for] button[data-watch]').first();
      await expect(btn).toBeVisible();
      const yt = await btn.getAttribute('data-watch');
      await btn.click();
      await expectPlaying(page, yt || undefined);
    });
  });
}
