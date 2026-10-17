import { test, expect, APP, open, type Mode } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec watch-shelf, Requirement "The existing shelf is migrated", Scenario "A playlist":
   WHEN the shelf is migrated THEN no entry links to a playlist or a channel.
   Checked two ways: the data file the shelf loads (every entry, every Mode), and what each Mode's shelf renders
   (anchors and the player's iframe). YouTube itself is answered locally, so no third-party player loads. */

const PLAYLIST_OR_CHANNEL = /youtube(-nocookie)?\.com\/(playlist|channel\/|c\/|user\/|@|embed\/videoseries|[^?#]*\/shorts\/?$)|[?&]list=|youtu\.be\/.*[?&]list=/i;

async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
}
test.beforeEach(async ({ page }) => { await noYouTube(page); });

test('the shelf data has no playlist or channel entry: every video is one 11-character YouTube id', async ({ page }) => {
  await open(page, '#/');
  const data = await page.evaluate(async (app) => {
    const m = await import(`${app}js/videos.js`);
    return { videos: m.VIDEOS, links: m.LINKS };
  }, APP);
  expect(data.videos.length).toBeGreaterThan(0);
  for (const v of data.videos) {
    expect(v.yt, `${v.id}: yt is a single video id, not a playlist or channel`).toMatch(/^[A-Za-z0-9_-]{11}$/);
    expect(['video', 'short'], `${v.id}: kind`).toContain(v.kind);
    for (const val of Object.values(v)) if (typeof val === 'string') expect(val, `${v.id}`).not.toMatch(PLAYLIST_OR_CHANNEL);
    expect(v.url, `${v.id}: a video entry carries no outside URL`).toBeUndefined();
  }
  for (const l of data.links) {
    expect(['site', 'game'], `${l.id}: a link is a website or game`).toContain(l.kind);
    expect(l.url, `${l.id}: no link to YouTube at all (no playlist, channel or Shorts page)`).not.toMatch(/youtube\.com|youtu\.be/i);
  }
});

for (const mode of ['explorer', 'challenger', 'pro'] as Mode[]) {
  test.describe(mode, () => {
    test.use({ seedMode: mode });
    test(`the ${mode} shelf links to no playlist or channel, and its player embeds a single video`, async ({ page }) => {
      await open(page, '#/watch');
      const cards = page.locator('#view button.watch-card');
      await expect(cards.first()).toBeVisible();
      const both = page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Both', exact: true });
      if (await both.count()) await both.click();
      if (mode === 'pro') {
        const every = page.getByRole('group', { name: 'Videos or Shorts', exact: true }).getByRole('button', { name: 'Everything', exact: true });
        if (await every.count()) await every.click();
      }
      const hrefs = await page.locator('#view a[href]').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href));
      for (const h of hrefs) expect(h).not.toMatch(PLAYLIST_OR_CHANNEL);
      const n = await cards.count();
      expect(n).toBeGreaterThan(0);
      const dlg = page.locator('dialog.vm-player');
      for (const i of [0, n - 1]) {
        await cards.nth(i).click();
        await expect(dlg).toBeVisible();
        await expect(dlg.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?/);
        expect(await dlg.locator('iframe').getAttribute('src')).not.toMatch(PLAYLIST_OR_CHANNEL);
        const out = await dlg.locator('a[href]').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href));
        for (const h of out) {
          expect(h).not.toMatch(PLAYLIST_OR_CHANNEL);
          expect(h).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
        }
        await page.keyboard.press('Escape');
        await expect(dlg).toBeHidden();
      }
    });
  });
}
